import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { criarToken } from "@/lib/session";

const SEGREDO = "segredo-de-teste-middleware";

function req(pathname: string, opts?: { cookie?: string }) {
  const headers = new Headers();
  if (opts?.cookie) headers.set("cookie", opts.cookie);
  return new NextRequest(new URL(pathname, "http://localhost:3000"), { headers });
}

describe("middleware", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = SEGREDO;
  });

  it("libera os caminhos públicos exatos sem cookie", async () => {
    for (const p of ["/login", "/api/login", "/api/progress"]) {
      const res = await middleware(req(p));
      expect(res.status).toBe(200);
      // NextResponse.next() não redireciona nem bloqueia.
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("bloqueia caminho irmão que apenas compartilha o prefixo", async () => {
    const res = await middleware(req("/api/progresso-secreto"));
    expect(res.status).toBe(401);
  });

  it("bloqueia caminho aninhado sob um público (regressão do F3)", async () => {
    const res = await middleware(req("/api/progress/qualquer-coisa"));
    expect(res.status).toBe(401);
  });

  it("responde 401 (não redireciona) para /api/* sem cookie de sessão", async () => {
    const res = await middleware(req("/api/groups"));
    expect(res.status).toBe(401);
    const corpo = await res.json();
    expect(corpo.erro).toBe("nao_autenticado");
  });

  it("redireciona para /login uma rota de página sem cookie de sessão", async () => {
    const res = await middleware(req("/"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location!).pathname).toBe("/login");
  });

  it("libera uma requisição com cookie de sessão válido", async () => {
    const token = await criarToken(SEGREDO);
    const res = await middleware(req("/api/groups", { cookie: `sessao=${token}` }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("bloqueia um cookie com assinatura adulterada", async () => {
    const token = await criarToken(SEGREDO);
    const adulterado = token.slice(0, -3) + "xxx";
    const res = await middleware(req("/api/groups", { cookie: `sessao=${adulterado}` }));
    expect(res.status).toBe(401);
  });

  it("bloqueia um cookie assinado com outro segredo", async () => {
    const token = await criarToken("outro-segredo-completamente-diferente");
    const res = await middleware(req("/api/groups", { cookie: `sessao=${token}` }));
    expect(res.status).toBe(401);
  });

  it("retorna 500 config_ausente quando SESSION_SECRET não está configurado", async () => {
    const anterior = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      const res = await middleware(req("/api/groups"));
      expect(res.status).toBe(500);
      const corpo = await res.json();
      expect(corpo.erro).toBe("config_ausente");
    } finally {
      process.env.SESSION_SECRET = anterior;
    }
  });
});
