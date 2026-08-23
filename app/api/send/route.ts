import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { enviarSchema, enviarContatoSchema } from "@/lib/schema";
import { chamarN8n, N8nIndisponivel } from "@/lib/n8n";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const modoContato =
    Boolean(corpo) && typeof corpo === "object" && (corpo as { modo?: unknown }).modo === "contato";

  let jobId: string;
  let payload: Record<string, unknown>;

  if (modoContato) {
    const parsed = enviarContatoSchema.safeParse(corpo);
    if (!parsed.success) {
      return NextResponse.json({ erro: "invalido", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const { telefone, nomeContato, mensagem } = parsed.data;
    jobId = parsed.data.jobId ?? randomUUID();
    payload = { telefone, nomeContato: nomeContato ?? "", mensagem, jobId, origem: "imediato" };
  } else {
    const parsed = enviarSchema.safeParse(corpo);
    if (!parsed.success) {
      return NextResponse.json({ erro: "invalido", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const { grupo, mensagem, fallbackNome } = parsed.data;
    jobId = parsed.data.jobId ?? randomUUID();
    payload = { grupo, mensagem, fallbackNome: fallbackNome ?? "", jobId, origem: "imediato" };
  }

  try {
    await chamarN8n("sms-dispatch", payload);
    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
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
