import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/login/route";

const SEGREDO = "segredo-de-teste-login";
const SENHA = "senha-correta-123";

let envAnterior: { segredo?: string; senha?: string };

function reqLogin(corpo: unknown) {
  return new Request("http://localhost:3000/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

describe("POST /api/login", () => {
  beforeEach(() => {
    envAnterior = {
      segredo: process.env.SESSION_SECRET,
      senha: process.env.APP_PASSWORD,
    };
    process.env.SESSION_SECRET = SEGREDO;
    process.env.APP_PASSWORD = SENHA;
  });

  afterEach(() => {
    if (envAnterior.segredo === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = envAnterior.segredo;
    if (envAnterior.senha === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = envAnterior.senha;
  });

  it("senha errada retorna 401 e não seta cookie de sessão", async () => {
    const res = await POST(reqLogin({ senha: "errada" }));
    expect(res.status).toBe(401);
    const corpo = await res.json();
    expect(corpo.erro).toBe("senha_invalida");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("senha correta retorna 200 e cookie httpOnly com os atributos corretos", async () => {
    const res = await POST(reqLogin({ senha: SENHA }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=43200");
  });

  it("APP_PASSWORD ausente retorna 500 config_ausente", async () => {
    delete process.env.APP_PASSWORD;
    const res = await POST(reqLogin({ senha: SENHA }));
    expect(res.status).toBe(500);
    const corpo = await res.json();
    expect(corpo.erro).toBe("config_ausente");
  });

  it("SESSION_SECRET ausente retorna 500 config_ausente", async () => {
    delete process.env.SESSION_SECRET;
    const res = await POST(reqLogin({ senha: SENHA }));
    expect(res.status).toBe(500);
    const corpo = await res.json();
    expect(corpo.erro).toBe("config_ausente");
  });
});
