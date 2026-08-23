"use client";

import { contarSms } from "@/lib/sms";

export function ContadorSegmentos({ texto, contatos }: { texto: string; contatos: number }) {
  const c = contarSms(texto);
  const totalSms = c.segmentos * contatos;

  // Tres barras: a ultima cresce com o numero de segmentos, tornando o custo visivel de relance.
  const alturas = [14, 22, 34];

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-preenchimento px-4 py-3.5">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[12px] text-tinta-fraca">
          {contatos} {contatos === 1 ? "contato" : "contatos"} × {c.segmentos}{" "}
          {c.segmentos === 1 ? "segmento" : "segmentos"}
        </span>
        <span className="fonte-titulo-numero text-[22px] text-tinta">{totalSms} SMS</span>
      </div>
      <div className="flex h-[34px] items-end gap-1">
        {alturas.map((h, i) => (
          <span
            key={h}
            className="w-1.5 rounded-sm"
            style={{
              height: h,
              background: i === alturas.length - 1 && c.segmentos > 1 ? "var(--vinho)" : "#D9C6B4",
            }}
          />
        ))}
      </div>
    </div>
  );
}
