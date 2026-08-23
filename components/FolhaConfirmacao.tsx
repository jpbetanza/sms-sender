"use client";

import { useEffect } from "react";
import { Users } from "lucide-react";
import { contarSms } from "@/lib/sms";

export function FolhaConfirmacao({
  aberta,
  aoFechar,
  aoConfirmar,
  grupoLabel,
  contatos,
  mensagem,
  fallbackNome,
  quando,
  enviando,
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  grupoLabel: string;
  contatos: number;
  mensagem: string;
  fallbackNome: string;
  quando: string;
  enviando: boolean;
}) {
  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, enviando, aoFechar]);

  if (!aberta) return null;

  const c = contarSms(mensagem);
  const totalSms = c.segmentos * contatos;
  // Previa honesta: mostramos o texto como ele sai para quem NAO tem nome preenchido.
  const previa = mensagem.replace(/\{\{\s*nome\s*\}\}/g, fallbackNome || "…");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => !enviando && aoFechar()}
        className="absolute inset-0 bg-[rgba(46,30,30,.42)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar envio"
        className="relative flex w-full max-w-[430px] flex-col gap-4.5 rounded-t-[28px] bg-superficie px-5 pt-3 pb-7 shadow-[0_-12px_40px_rgba(46,30,30,.18)]"
      >
        <div className="h-1 w-10 self-center rounded-sm bg-borda" />
        <h2 className="fonte-titulo text-[26px] font-normal">Confirmar envio</h2>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-vinho text-[#F9F6F2]">
              <Users size={18} />
            </span>
            <span className="flex flex-col">
              <span className="text-[16px] font-semibold">{grupoLabel}</span>
              <span className="text-[13px] text-tinta-fraca">
                {contatos} contatos · {quando}
              </span>
            </span>
          </div>

          <div className="rounded-[16px] rounded-bl-[4px] bg-preenchimento px-4 py-3.5 text-[15px] leading-[1.55]">
            {previa}
          </div>
          {mensagem.includes("{{nome}}") && (
            <p className="-mt-1.5 text-[12px] text-tinta-fraca">
              Quem tiver nome na planilha recebe o nome no lugar de “{fallbackNome || "…"}”
            </p>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-borda px-4 py-3.5">
            <span className="text-[13px] text-tinta-suave">
              {contatos} × {c.segmentos} {c.segmentos === 1 ? "segmento" : "segmentos"}
            </span>
            <span className="fonte-titulo-numero text-[22px]">{totalSms} SMS</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={enviando}
            className="h-14 rounded-2xl bg-vinho text-[16px] font-semibold text-[#F9F6F2] disabled:opacity-70"
          >
            {enviando ? "Enviando…" : "Confirmar e enviar"}
          </button>
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="h-12 rounded-2xl text-[15px] text-tinta-suave"
          >
            Voltar e revisar
          </button>
        </div>
      </div>
    </div>
  );
}
