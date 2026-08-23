import { z } from "zod";

export const grupoSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  tem_nome: z.boolean(),
  sem_nome: z.number().int().nonnegative(),
  /** Preenchido quando a aba da planilha nao pode ser lida (renomeada, removida, sem permissao). */
  erro: z.string().nullable().optional(),
});
export type Grupo = z.infer<typeof grupoSchema>;

export const gruposSchema = z.array(grupoSchema);

const baseEnvio = z.object({
  grupo: z.string().min(1, "Escolha um grupo"),
  mensagem: z.string().trim().min(1, "Escreva a mensagem"),
  fallbackNome: z.string().trim().min(1).optional(),
  jobId: z.string().min(8).optional(),
});

const exigeFallback = (v: z.infer<typeof baseEnvio>) =>
  !v.mensagem.includes("{{nome}}") || Boolean(v.fallbackNome);

const erroFallback = {
  message: "Informe o texto a usar quando o contato não tiver nome",
  path: ["fallbackNome"],
};

export const enviarSchema = baseEnvio.refine(exigeFallback, erroFallback);
export type EnviarInput = z.infer<typeof enviarSchema>;

const MINIMO_ADIANTAMENTO_MS = 2 * 60 * 1000;

export const agendarSchema = baseEnvio
  .extend({ agendadoParaMs: z.number().int() })
  .refine(exigeFallback, erroFallback)
  .refine((v) => v.agendadoParaMs > Date.now() + MINIMO_ADIANTAMENTO_MS, {
    message: "Agende para pelo menos 2 minutos à frente",
    path: ["agendadoParaMs"],
  });
export type AgendarInput = z.infer<typeof agendarSchema>;


export const agendamentoSchema = z.object({
  id: z.string(),
  grupo: z.string(),
  mensagem: z.string(),
  agendado_para: z.string(),
  agendado_para_ms: z.number(),
  status: z.enum(["pendente", "enviando", "enviado", "perdido", "cancelado"]),
});
export type Agendamento = z.infer<typeof agendamentoSchema>;

export const disparoSchema = z.object({
  id: z.string(),
  job_id: z.string().nullable(),
  grupo: z.string(),
  mensagem: z.string(),
  origem: z.enum(["imediato", "agendado"]),
  iniciado_em: z.string(),
  finalizado_em: z.string().nullable(),
  total: z.number().int(),
  enviados: z.number().int(),
  falhas: z.number().int(),
});
export type Disparo = z.infer<typeof disparoSchema>;

export const progressoDisparoSchema = z.object({
  jobId: z.string(),
  status: z.enum(["enviando", "concluido"]),
  total: z.number().int().nonnegative(),
  processados: z.number().int().nonnegative(),
  enviados: z.number().int().nonnegative(),
  falhas: z.number().int().nonnegative(),
});
export type ProgressoDisparo = z.infer<typeof progressoDisparoSchema>;
