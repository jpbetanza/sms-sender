import { NextResponse } from "next/server";
import { z } from "zod";
import { chamarN8n } from "@/lib/n8n";
import { agendarSchema, agendarContatoSchema, agendamentoSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bruto = await chamarN8n<unknown>("sms-consultas", { action: "agendamentos.listar" });
    return NextResponse.json(z.array(agendamentoSchema).parse(bruto));
  } catch {
    return NextResponse.json(
      { erro: "agendamentos_indisponiveis", mensagem: "Não consegui carregar os agendamentos." },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const modoContato =
    Boolean(corpo) && typeof corpo === "object" && (corpo as { modo?: unknown }).modo === "contato";

  let payload: Record<string, unknown>;

  if (modoContato) {
    const parsed = agendarContatoSchema.safeParse(corpo);
    if (!parsed.success) {
      return NextResponse.json({ erro: "invalido", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const { telefone, nomeContato, mensagem, agendadoParaMs } = parsed.data;
    payload = {
      action: "agendamentos.criar",
      telefone,
      nome_contato: nomeContato ?? "",
      mensagem,
      agendado_para_ms: agendadoParaMs,
      agendado_para: new Date(agendadoParaMs).toISOString(),
    };
  } else {
    const parsed = agendarSchema.safeParse(corpo);
    if (!parsed.success) {
      return NextResponse.json({ erro: "invalido", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const { grupo, mensagem, fallbackNome, agendadoParaMs } = parsed.data;
    payload = {
      action: "agendamentos.criar",
      grupo,
      mensagem,
      fallback_nome: fallbackNome ?? "",
      agendado_para_ms: agendadoParaMs,
      agendado_para: new Date(agendadoParaMs).toISOString(),
    };
  }

  try {
    const criado = await chamarN8n<unknown>("sms-consultas", payload);
    return NextResponse.json(criado, { status: 201 });
  } catch {
    return NextResponse.json(
      { erro: "falha_ao_agendar", mensagem: "Não consegui salvar o agendamento." },
      { status: 502 },
    );
  }
}
