const DOZE_HORAS_MS = 12 * 60 * 60 * 1000;
const enc = new TextEncoder();

async function chaveHmac(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function assinar(payload: string, segredo: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await chaveHmac(segredo), enc.encode(payload));
  return base64url(new Uint8Array(sig));
}

/** Comparacao de tempo constante. So use com strings de mesmo comprimento (hashes). */
export function comparaSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function criarToken(segredo: string, agora: number = Date.now()): Promise<string> {
  const exp = String(agora + DOZE_HORAS_MS);
  return `${exp}.${await assinar(exp, segredo)}`;
}

export async function validarToken(
  token: string | undefined,
  segredo: string,
  agora: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [exp, assinatura] = partes;
  // A assinatura e conferida antes da validade: sem isso, exp seria forjavel.
  if (!comparaSegura(await assinar(exp, segredo), assinatura)) return false;
  const limite = Number(exp);
  return Number.isFinite(limite) && limite > agora;
}

/**
 * Compara senhas pelos HMACs, nao pelos textos: assim o tempo de resposta
 * nao revela o comprimento da senha correta.
 */
export async function senhaConfere(
  entrada: string,
  esperada: string,
  segredo: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([assinar(entrada, segredo), assinar(esperada, segredo)]);
  return comparaSegura(a, b);
}
