export class N8nIndisponivel extends Error {
  constructor(motivo: string) {
    super(`n8n indisponível: ${motivo}`);
    this.name = "N8nIndisponivel";
  }
}

export class N8nErro extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
    this.name = "N8nErro";
  }
}

const TIMEOUT_PADRAO_MS = 15_000;

export async function chamarN8n<T>(
  caminho: string,
  corpo: unknown,
  timeoutMs: number = TIMEOUT_PADRAO_MS,
): Promise<T> {
  const base = process.env.N8N_BASE_URL;
  const token = process.env.N8N_APP_TOKEN;
  if (!base || !token) {
    throw new N8nIndisponivel("N8N_BASE_URL ou N8N_APP_TOKEN não configurado");
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);

  try {
    const resposta = await fetch(`${base}/webhook/${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-APP-TOKEN": token },
      body: JSON.stringify(corpo),
      signal: controle.signal,
      cache: "no-store",
    });

    if (!resposta.ok) {
      throw new N8nErro(`n8n respondeu ${resposta.status}`, resposta.status);
    }

    return (await resposta.json()) as T;
  } catch (e) {
    if (e instanceof N8nErro) throw e;
    throw new N8nIndisponivel(e instanceof Error ? e.message : "falha desconhecida");
  } finally {
    clearTimeout(timer);
  }
}
