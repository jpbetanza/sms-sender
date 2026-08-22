import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chamarN8n, N8nIndisponivel, N8nErro } from "@/lib/n8n";

beforeEach(() => {
  process.env.N8N_BASE_URL = "https://n8n.exemplo";
  process.env.N8N_APP_TOKEN = "token-secreto";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chamarN8n", () => {
  it("envia o token no header e devolve o JSON", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await chamarN8n<{ ok: boolean }>("sms-consultas", { action: "grupos" });

    expect(r).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://n8n.exemplo/webhook/sms-consultas");
    expect((init as RequestInit).headers).toMatchObject({ "X-APP-TOKEN": "token-secreto" });
  });

  it("transforma status de erro em N8nErro com o código", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nao autorizado", { status: 403 })));
    await expect(chamarN8n("sms-consultas", {})).rejects.toBeInstanceOf(N8nErro);
  });

  it("transforma falha de rede em N8nIndisponivel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    await expect(chamarN8n("sms-consultas", {})).rejects.toBeInstanceOf(N8nIndisponivel);
  });

  it("aborta por timeout e reporta indisponibilidade", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    ));
    await expect(chamarN8n("sms-consultas", {}, 20)).rejects.toBeInstanceOf(N8nIndisponivel);
  });

  it("falha claramente se a configuração estiver ausente", async () => {
    delete process.env.N8N_APP_TOKEN;
    await expect(chamarN8n("sms-consultas", {})).rejects.toBeInstanceOf(N8nIndisponivel);
  });
});
