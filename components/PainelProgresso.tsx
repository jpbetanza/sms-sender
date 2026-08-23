"use client";

import type { ProgressoDisparo } from "@/lib/schema";

export function PainelProgresso({
  progresso,
  perdido,
  iniciadoEm,
}: {
  progresso: ProgressoDisparo | null;
  perdido: boolean;
  iniciadoEm: number | null;
}) {
  if (perdido) {
    return (
      <div className="rounded-2xl bg-preenchimento px-4 py-3.5 text-[13px] leading-[1.5] text-tinta-suave">
        Perdi o acompanhamento deste envio. Ele pode ter continuado — confira no histórico.
      </div>
    );
  }

  if (!progresso) {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="h-2.5 overflow-hidden rounded-full bg-[#EDE5DB]">
          <div className="h-full w-1/4 animate-pulse rounded-full bg-vinho" />
        </div>
        <p className="text-[13px] text-tinta-suave">Iniciando envio…</p>
      </div>
    );
  }

  const { total, processados, enviados, falhas } = progresso;
  const concluido = progresso.status === "concluido";
  const pct = total > 0 ? Math.round((processados / total) * 100) : 0;

  // Estimativa a partir do ritmo real observado, nao de um numero fixo.
  let restante: string | null = null;
  if (!concluido && iniciadoEm && processados > 0 && total > processados) {
    const porContato = (Date.now() - iniciadoEm) / processados;
    const segundos = Math.round((porContato * (total - processados)) / 1000);
    restante = segundos < 60 ? `≈ ${segundos}s restantes` : `≈ ${Math.ceil(segundos / 60)} min restantes`;
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-baseline gap-2">
          <span className="fonte-titulo-numero text-[56px] leading-none text-vinho">
            {concluido ? enviados : processados}
          </span>
          <span className="text-[16px] text-tinta-suave">
            de {total || "…"} contatos
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#EDE5DB]">
          <div
            className="h-full rounded-full bg-vinho transition-[width] duration-500"
            style={{ width: `${concluido ? 100 : pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[13px] text-tinta-suave">
          <span>{concluido ? "Envio concluído" : `${pct}% concluído`}</span>
          {restante && <span>{restante}</span>}
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-borda bg-superficie p-3.5">
          <span className="text-[12px] text-tinta-fraca">Entregues</span>
          <span className="text-[22px] font-semibold">{enviados}</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-borda bg-superficie p-3.5">
          <span className="text-[12px] text-tinta-fraca">Falhas</span>
          <span className="text-[22px] font-semibold" style={{ color: falhas > 0 ? "var(--erro)" : undefined }}>
            {falhas}
          </span>
        </div>
      </div>

      {!concluido && (
        <div className="rounded-2xl bg-preenchimento px-4 py-3.5 text-[13px] leading-[1.5] text-tinta-suave">
          Pode sair desta tela — o envio continua e aparece no histórico quando terminar.
        </div>
      )}
    </div>
  );
}
