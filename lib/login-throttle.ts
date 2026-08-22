const JANELA_MS = 15 * 60 * 1000;
const TETO_MS = 30_000;

let falhas = 0;
let ultimaFalhaEm = 0;

/** Falhas que ainda contam: tudo decai depois de JANELA_MS sem nenhuma falha nova. */
function falhasVigentes(agora: number): number {
  if (falhas === 0) return 0;
  if (agora - ultimaFalhaEm > JANELA_MS) {
    falhas = 0;
    return 0;
  }
  return falhas;
}

/** Quanto esperar antes de avaliar a proxima tentativa, em ms. */
export function atrasoDaProximaTentativa(agora: number = Date.now()): number {
  const n = falhasVigentes(agora);
  if (n === 0) return 0;
  return Math.min(1000 * 2 ** (n - 1), TETO_MS);
}

export function registrarFalha(agora: number = Date.now()): void {
  falhasVigentes(agora);
  falhas += 1;
  ultimaFalhaEm = agora;
}

export function limparFalhas(): void {
  falhas = 0;
  ultimaFalhaEm = 0;
}
