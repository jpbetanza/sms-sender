import { NextResponse } from "next/server";
import { chamarN8n } from "@/lib/n8n";
import type { ProgressoDisparo } from "@/lib/schema";

export const runtime = "nodejs";

type LinhaDisparo = {
  job_id?: string;
  total?: number;
  processados?: number;
  enviados?: number;
  falhas?: number;
  finalizado_em?: string | null;
};

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;

  let linha: LinhaDisparo;
  try {
    linha = await chamarN8n<LinhaDisparo>("sms-consultas", { action: "disparo.status", jobId });
  } catch {
    return NextResponse.json({ erro: "progresso_indisponivel" }, { status: 503 });
  }

  // O n8n devolve item vazio quando nao encontra a linha.
  if (!linha?.job_id) {
    return NextResponse.json({ erro: "job_desconhecido" }, { status: 404 });
  }

  const concluido = Boolean(linha.finalizado_em);
  const progresso: ProgressoDisparo = {
    jobId,
    status: concluido ? "concluido" : "enviando",
    total: linha.total ?? 0,
    processados: concluido ? (linha.total ?? 0) : (linha.processados ?? 0),
    enviados: linha.enviados ?? 0,
    falhas: linha.falhas ?? 0,
  };

  return NextResponse.json(progresso);
}
