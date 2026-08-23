import { NextResponse } from "next/server";
import { chamarN8n } from "@/lib/n8n";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const r = await chamarN8n<{ ok: boolean; motivo?: string }>("sms-consultas", {
      action: "agendamentos.cancelar",
      id,
    });

    if (!r.ok && r.motivo === "ja_iniciado") {
      return NextResponse.json(
        { erro: "ja_iniciado", mensagem: "Esse envio já começou e não pode ser cancelado." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { erro: "falha_ao_cancelar", mensagem: "Não consegui cancelar o agendamento." },
      { status: 502 },
    );
  }
}
