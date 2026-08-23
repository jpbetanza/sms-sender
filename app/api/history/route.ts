import { NextResponse } from "next/server";
import { z } from "zod";
import { chamarN8n } from "@/lib/n8n";
import { disparoSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bruto = await chamarN8n<unknown>("sms-consultas", { action: "historico" });
    return NextResponse.json(z.array(disparoSchema).parse(bruto));
  } catch {
    return NextResponse.json(
      { erro: "historico_indisponivel", mensagem: "Não consegui carregar o histórico." },
      { status: 503 },
    );
  }
}
