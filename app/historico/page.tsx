"use client";

import { useEffect, useMemo, useState } from "react";
import type { Disparo } from "@/lib/schema";

const FUSO = "America/Sao_Paulo";

export default function HistoricoPage() {
  const [itens, setItens] = useState<Disparo[] | null>(null);

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : []))
      .then(setItens);
  }, []);

  // Resumo do mes corrente, somado a partir do proprio historico.
  const resumo = useMemo(() => {
    if (!itens) return null;
    const agora = new Date();
    const doMes = itens.filter((d) => {
      const q = new Date(d.iniciado_em);
      return q.getMonth() === agora.getMonth() && q.getFullYear() === agora.getFullYear();
    });
    return {
      enviados: doMes.reduce((s, d) => s + (d.enviados ?? 0), 0),
      falhas: doMes.reduce((s, d) => s + (d.falhas ?? 0), 0),
    };
  }, [itens]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3.5 px-5 pt-5 pb-4">
        {resumo && (
          <div className="flex gap-5 rounded-2xl bg-preenchimento px-4 py-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] tracking-[.06em] text-tinta-fraca uppercase">
                Este mês
              </span>
              <span className="fonte-titulo-numero text-[22px]">
                {resumo.enviados.toLocaleString("pt-BR")} SMS
              </span>
            </div>
            <div className="w-px bg-borda" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] tracking-[.06em] text-tinta-fraca uppercase">
                Falhas
              </span>
              <span
                className="fonte-titulo-numero text-[22px]"
                style={{ color: resumo.falhas > 0 ? "var(--erro)" : undefined }}
              >
                {resumo.falhas}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6">
        {!itens && <div className="h-24 animate-pulse rounded-2xl bg-preenchimento" />}

        {itens?.length === 0 && (
          <p className="text-[15px] text-tinta-suave">Nenhum disparo ainda.</p>
        )}

        {itens?.map((d) => {
          const quando = new Date(d.iniciado_em);
          const emAndamento = !d.finalizado_em;

          return (
            <div key={d.id} className="flex gap-3.5 border-b border-[#EBE4DA] py-4">
              <div className="flex w-11 flex-none flex-col items-center pt-0.5">
                <span className="fonte-titulo-numero text-[20px] leading-none">
                  {quando.toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit" })}
                </span>
                <span className="text-[11px] tracking-[.06em] text-tinta-fraca uppercase">
                  {quando
                    .toLocaleDateString("pt-BR", { timeZone: FUSO, month: "short" })
                    .replace(".", "")}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="truncate text-[15px] font-semibold">{d.grupo}</span>
                  <span className="flex-none text-[13px] text-tinta-suave">
                    {quando.toLocaleTimeString("pt-BR", {
                      timeZone: FUSO,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="truncate text-[13px] leading-[1.45] text-tinta-suave">{d.mensagem}</p>
                <div className="flex items-center gap-2 text-[12px]">
                  {emAndamento ? (
                    <span className="text-alerta">em andamento</span>
                  ) : (
                    <>
                      <span className="text-sucesso">{d.enviados} enviados</span>
                      {d.falhas > 0 && <span className="text-erro">· {d.falhas} falhas</span>}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
