"use client";

import { contarSms } from "@/lib/sms";
import { TriangleAlert } from "lucide-react";

export function EditorMensagem({
  valor,
  aoMudar,
  podeUsarNome,
  fallbackNome,
  aoMudarFallback,
  dicaFallback,
  rotuloFallback = "sem nome →",
  placeholderFallback = "responsável",
}: {
  valor: string;
  aoMudar: (v: string) => void;
  podeUsarNome: boolean;
  fallbackNome: string;
  aoMudarFallback: (v: string) => void;
  dicaFallback: string | null;
  rotuloFallback?: string;
  placeholderFallback?: string;
}) {
  const c = contarSms(valor);
  const usaNome = valor.includes("{{nome}}");

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold tracking-[.1em] text-tinta-fraca uppercase">
          Mensagem
        </div>
        <div className="text-[12px] text-tinta-fraca">
          {c.caracteres}{" "}
          <span className="text-[#C9BFB5]">/ {c.limitePorSegmento} por segmento</span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[18px] border border-borda bg-superficie p-4">
        <textarea
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          rows={4}
          placeholder="Escreva o comunicado"
          className="resize-none bg-transparent text-[16px] leading-[1.55] text-tinta outline-none placeholder:text-tinta-fraca"
        />

        {(podeUsarNome || usaNome) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-borda-suave pt-3">
          {podeUsarNome && (
            <button
              type="button"
              onClick={() => aoMudar(`${valor}{{nome}}`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-borda bg-fundo px-3 text-[13px] font-semibold text-vinho-escuro"
            >
              + nome
            </button>
          )}
          {usaNome ? (
            <label className="flex flex-1 items-center gap-2 text-[12px] text-tinta-fraca">
              {rotuloFallback}
              <input
                value={fallbackNome}
                onChange={(e) => aoMudarFallback(e.target.value)}
                placeholder={placeholderFallback}
                required
                className="min-w-0 flex-1 rounded-lg bg-preenchimento px-2 py-1 text-[13px] text-tinta outline-none placeholder:text-tinta-fraca"
              />
            </label>
          ) : (
            podeUsarNome && (
              <span className="text-[12px] text-tinta-fraca">
                use <span className="font-medium">+ nome</span> para personalizar
              </span>
            )
          )}
        </div>
        )}
      </div>

      {usaNome && dicaFallback && (
        <p className="text-[12px] text-tinta-fraca">{dicaFallback}</p>
      )}

      {c.alfabeto === "UCS-2" && (
        <div className="flex items-center gap-2 text-[12px] text-alerta">
          <TriangleAlert size={14} />
          <span>O acento reduziu o limite para 70 caracteres</span>
        </div>
      )}
    </div>
  );
}
