export type StatusJob = "enviando" | "concluido" | "erro";

export type Job = {
  jobId: string;
  grupo: string;
  total: number;
  enviados: number;
  falhas: number;
  status: StatusJob;
  criadoEm: number;
  atualizadoEm: number;
};

const TTL_MS = 60 * 60 * 1000;
const jobs = new Map<string, Job>();

/** Varredura preguicosa: evita manter um timer vivo so para limpar memoria. */
function limparExpirados(agora: number): void {
  for (const [id, j] of jobs) {
    if (agora - j.criadoEm > TTL_MS) jobs.delete(id);
  }
}

export function abrirJob(jobId: string, grupo: string, agora: number = Date.now()): Job {
  limparExpirados(agora);
  const job: Job = {
    jobId, grupo, total: 0, enviados: 0, falhas: 0,
    status: "enviando", criadoEm: agora, atualizadoEm: agora,
  };
  jobs.set(jobId, job);
  return job;
}

export function jobExiste(jobId: string, agora: number = Date.now()): boolean {
  limparExpirados(agora);
  return jobs.has(jobId);
}

export function definirTotal(jobId: string, total: number, agora: number = Date.now()): void {
  const j = jobs.get(jobId);
  if (!j) return;
  j.total = total;
  j.atualizadoEm = agora;
}

export function registrarResultado(jobId: string, ok: boolean, agora: number = Date.now()): void {
  const j = jobs.get(jobId);
  if (!j) return;
  if (ok) j.enviados += 1;
  else j.falhas += 1;
  j.atualizadoEm = agora;
}

export function fecharJob(
  jobId: string, enviados: number, falhas: number, agora: number = Date.now(),
): void {
  const j = jobs.get(jobId);
  if (!j) return;
  j.enviados = enviados;
  j.falhas = falhas;
  j.status = "concluido";
  j.atualizadoEm = agora;
}

export function marcarErro(jobId: string, agora: number = Date.now()): void {
  const j = jobs.get(jobId);
  if (!j) return;
  j.status = "erro";
  j.atualizadoEm = agora;
}

export function obterJob(jobId: string, agora: number = Date.now()): Job | undefined {
  limparExpirados(agora);
  return jobs.get(jobId);
}
