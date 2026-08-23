"use client";

import type { Grupo } from "@/lib/schema";

export function SeletorGrupo({
  grupos,
  valor,
  aoMudar,
}: {
  grupos: Grupo[];
  valor: string;
  aoMudar: (chave: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[11px] font-semibold tracking-[.1em] text-tinta-fraca uppercase">Para</div>
      <div className="flex flex-wrap gap-2">
        {grupos.map((g) => {
          const escolhido = g.id === valor;
          const indisponivel = Boolean(g.erro);

          return (
            <button
              key={g.id}
              type="button"
              disabled={indisponivel}
              onClick={() => aoMudar(g.id)}
              aria-pressed={escolhido}
              aria-label={
                indisponivel
                  ? `${g.label}, indisponível: ${g.erro}`
                  : `${g.label}, ${g.count} ${g.count === 1 ? "contato" : "contatos"}`
              }
              className="flex flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
              style={
                escolhido
                  ? { background: "var(--vinho)", color: "#F9F6F2" }
                  : {
                      background: "var(--superficie)",
                      border: "1px solid var(--borda)",
                      opacity: indisponivel ? 0.6 : 1,
                    }
              }
            >
              <span className={`text-[14px] ${escolhido ? "font-semibold" : "font-medium"}`}>
                {g.label}
              </span>
              <span
                className="text-[12px]"
                style={{
                  color: escolhido ? "rgba(249,246,242,.75)" : indisponivel ? "var(--erro)" : "var(--tinta-fraca)",
                }}
              >
                {indisponivel ? g.erro : `${g.count} ${g.count === 1 ? "contato" : "contatos"}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
