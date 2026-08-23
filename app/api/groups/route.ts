import { NextResponse } from "next/server";
import { chamarN8n, N8nIndisponivel } from "@/lib/n8n";
import { gruposSchema, type Grupo } from "@/lib/schema";

export const runtime = "nodejs";

const CACHE_MS = 60_000;
let cache: { em: number; dados: Grupo[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.em < CACHE_MS) {
    return NextResponse.json(cache.dados);
  }

  try {
    const bruto = await chamarN8n<unknown>("sms-consultas", { action: "grupos" });
    const dados = gruposSchema.parse(bruto);
    cache = { em: Date.now(), dados };
    return NextResponse.json(dados);
  } catch (e) {
    // Contagem de um minuto atras e melhor que tela vazia.
    if (cache) {
      return NextResponse.json(cache.dados, { headers: { "X-Cache-Obsoleto": "1" } });
    }
    const status = e instanceof N8nIndisponivel ? 503 : 502;
    return NextResponse.json(
      { erro: "grupos_indisponiveis", mensagem: "Não consegui carregar os grupos." },
      { status },
    );
  }
}
