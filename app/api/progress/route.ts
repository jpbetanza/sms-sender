import { NextResponse } from "next/server";
import { progressoSchema } from "@/lib/schema";
import { definirTotal, registrarResultado, fecharJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = req.headers.get("x-callback-token");
  if (!token || token !== process.env.APP_CALLBACK_TOKEN) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const parsed = progressoSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ erro: "payload_invalido" }, { status: 400 });
  }

  const evento = parsed.data;
  // Job inexistente e esperado: disparo agendado nao tem ninguem olhando a tela.
  switch (evento.evento) {
    case "inicio":
      definirTotal(evento.jobId, evento.total);
      break;
    case "progresso":
      registrarResultado(evento.jobId, evento.ok);
      break;
    case "fim":
      fecharJob(evento.jobId, evento.enviados, evento.falhas);
      break;
  }

  return NextResponse.json({ ok: true });
}
