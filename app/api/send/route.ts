import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { enviarSchema } from "@/lib/schema";
import { chamarN8n, N8nIndisponivel } from "@/lib/n8n";
import { abrirJob, jobExiste, marcarErro } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const parsed = enviarSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ erro: "invalido", detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const { grupo, mensagem, fallbackNome } = parsed.data;
  const jobId = parsed.data.jobId ?? randomUUID();

  // Clique duplo: o segundo POST encontra o job aberto e nao dispara de novo.
  if (jobExiste(jobId)) {
    return NextResponse.json({ ok: true, jobId, duplicado: true });
  }

  abrirJob(jobId, grupo);

  try {
    await chamarN8n("sms-dispatch", {
      grupo,
      mensagem,
      fallbackNome: fallbackNome ?? "",
      jobId,
      callbackUrl: `${process.env.APP_PUBLIC_URL}/api/progress`,
      origem: "imediato",
    });
    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    marcarErro(jobId);
    if (e instanceof N8nIndisponivel) {
      // Ambiguidade real: pode ter chegado no n8n. Nao afirmamos que falhou.
      return NextResponse.json(
        {
          erro: "nao_confirmado",
          jobId,
          mensagem: "Não consegui confirmar o disparo. Verifique no histórico antes de tentar de novo.",
        },
        { status: 504 },
      );
    }
    return NextResponse.json({ erro: "falha_n8n", jobId }, { status: 502 });
  }
}
