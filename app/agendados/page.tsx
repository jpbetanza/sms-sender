"use client";

import { useEffect, useMemo, useState } from "react";
import { addToast } from "@heroui/toast";
import type { Agendamento } from "@/lib/schema";

const FUSO = "America/Sao_Paulo";

const COR: Record<Agendamento["status"], string> = {
  pendente: "var(--vinho)",
  enviando: "var(--alerta)",
  enviado: "var(--sucesso)",
  perdido: "var(--erro)",
  cancelado: "var(--tinta-fraca)",
};

const ROTULO: Record<Agendamento["status"], string> = {
  pendente: "agendado",
  enviando: "enviando",
  enviado: "enviado",
  perdido: "não enviado",
  cancelado: "cancelado",
};

function tituloDoDia(ms: number): string {
  const data = new Date(ms);
  const hoje = new Date();
  const amanha = new Date(hoje.getTime() + 86_400_000);
  const mesmoDia = (a: Date, b: Date) =>
    a.toLocaleDateString("pt-BR", { timeZone: FUSO }) ===
    b.toLocaleDateString("pt-BR", { timeZone: FUSO });

  const porExtenso = data.toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    day: "numeric",
    month: "long",
  });

  if (mesmoDia(data, hoje)) return `Hoje · ${porExtenso}`;
  if (mesmoDia(data, amanha)) return `Amanhã · ${porExtenso}`;
  return porExtenso;
}

export default function AgendadosPage() {
  const [itens, setItens] = useState<Agendamento[] | null>(null);

  async function carregar() {
    const r = await fetch("/api/schedules", { cache: "no-store" });
    setItens(r.ok ? await r.json() : []);
  }

  useEffect(() => {
    carregar();
  }, []);

  const dias = useMemo(() => {
    if (!itens) return [];
    const porDia = new Map<string, Agendamento[]>();
    for (const a of [...itens].sort((x, y) => x.agendado_para_ms - y.agendado_para_ms)) {
      const chave = tituloDoDia(a.agendado_para_ms);
      porDia.set(chave, [...(porDia.get(chave) ?? []), a]);
    }
    return [...porDia.entries()].map(([titulo, lista]) => ({ titulo, lista }));
  }, [itens]);

  async function cancelar(id: string) {
    const r = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      addToast({ title: "Não deu para cancelar", description: corpo.mensagem, color: "danger" });
    }
    carregar();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-2 pb-5">
        <h1 className="fonte-titulo text-[30px] font-normal">Agendados</h1>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pb-6">
        {!itens && <div className="h-28 animate-pulse rounded-[18px] bg-preenchimento" />}

        {itens?.length === 0 && (
          <p className="text-[15px] text-tinta-suave">Nenhum envio agendado.</p>
        )}

        {dias.map(({ titulo, lista }) => (
          <div key={titulo} className="flex flex-col gap-2.5">
            <div className="text-[11px] font-semibold tracking-[.1em] text-tinta-fraca uppercase">
              {titulo}
            </div>

            {lista.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2.5 rounded-[18px] border border-borda bg-superficie p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 flex-none rounded-full"
                      style={{ background: COR[a.status] }}
                    />
                    <span className="truncate text-[16px] font-semibold">{a.grupo}</span>
                  </div>
                  <span className="flex-none fonte-titulo-numero text-[18px]">
                    {new Date(a.agendado_para_ms).toLocaleTimeString("pt-BR", {
                      timeZone: FUSO,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="line-clamp-2 text-[14px] leading-[1.5] text-tinta-suave">
                  {a.mensagem}
                </p>

                <div className="flex items-center justify-between border-t border-borda-suave pt-2.5">
                  <span className="text-[12px] text-tinta-fraca">{ROTULO[a.status]}</span>
                  {a.status === "pendente" && (
                    <button
                      type="button"
                      onClick={() => cancelar(a.id)}
                      className="h-[30px] rounded-[10px] border border-[#E9D5D5] px-3 text-[13px] font-medium text-erro"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
