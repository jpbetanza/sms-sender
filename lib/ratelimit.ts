const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS = 5;

type Registro = { falhas: number; primeiraEm: number };

const porIp = new Map<string, Registro>();

export function podeTentar(ip: string, agora: number = Date.now()): boolean {
  const r = porIp.get(ip);
  if (!r) return true;
  if (agora - r.primeiraEm > JANELA_MS) {
    porIp.delete(ip);
    return true;
  }
  return r.falhas < MAX_FALHAS;
}

export function registrarFalha(ip: string, agora: number = Date.now()): void {
  const r = porIp.get(ip);
  if (!r || agora - r.primeiraEm > JANELA_MS) {
    porIp.set(ip, { falhas: 1, primeiraEm: agora });
    return;
  }
  r.falhas += 1;
}

export function limparTentativas(ip: string): void {
  porIp.delete(ip);
}
