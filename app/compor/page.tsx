"use client";

import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "@heroui/date-picker";
import { addToast } from "@heroui/toast";
import { Send } from "lucide-react";
import { now, getLocalTimeZone, type ZonedDateTime } from "@internationalized/date";
import type { Grupo } from "@/lib/schema";
import { contarSms } from "@/lib/sms";
import { SeletorGrupo } from "@/components/SeletorGrupo";
import { EditorMensagem } from "@/components/EditorMensagem";
import { ContadorSegmentos } from "@/components/ContadorSegmentos";
import { FolhaConfirmacao } from "@/components/FolhaConfirmacao";
import { PainelProgresso } from "@/components/PainelProgresso";
import { useJobProgress } from "@/hooks/useJobProgress";

export default function ComporPage() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erroGrupos, setErroGrupos] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [fallbackNome, setFallbackNome] = useState("");
  const [quando, setQuando] = useState<"agora" | "agendar">("agora");
  const [dataHora, setDataHora] = useState<ZonedDateTime | null>(
    now(getLocalTimeZone()).add({ minutes: 30 }),
  );
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [iniciadoEm, setIniciadoEm] = useState<number | null>(null);
  const { progresso, perdido } = useJobProgress(jobId);

  useEffect(() => {
    fetch("/api/groups")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).mensagem ?? "falha");
        return r.json();
      })
      .then(setGrupos)
      .catch((e: Error) => setErroGrupos(e.message));
  }, []);

  const grupo = useMemo(() => grupos?.find((g) => g.id === grupoId) ?? null, [grupos, grupoId]);
  const usaNome = mensagem.includes("{{nome}}");
  const contatos = grupo?.count ?? 0;
  const totalSms = contarSms(mensagem).segmentos * contatos;
  const podeEnviar =
    Boolean(grupoId) && mensagem.trim().length > 0 && (!usaNome || fallbackNome.trim().length > 0);

  const dicaFallback = grupo
    ? grupo.sem_nome > 0
      ? `${grupo.sem_nome} de ${grupo.count} contatos estão sem nome preenchido`
      : "Todos os contatos têm nome — usado só se algum ficar em branco"
    : null;

  async function confirmar() {
    setEnviando(true);
    const novoJobId = crypto.randomUUID();

    try {
      if (quando === "agora") {
        const r = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grupo: grupoId,
            mensagem,
            fallbackNome: usaNome ? fallbackNome : undefined,
            jobId: novoJobId,
          }),
        });
        const corpo = await r.json().catch(() => ({}));

        if (r.status === 504) {
          setConfirmando(false);
          addToast({ title: "Não consegui confirmar", description: corpo.mensagem, color: "warning" });
          return;
        }
        if (!r.ok) {
          addToast({
            title: "Falha no envio",
            description: corpo.mensagem ?? "Tente de novo.",
            color: "danger",
          });
          return;
        }

        setIniciadoEm(Date.now());
        setJobId(corpo.jobId ?? novoJobId);
        setConfirmando(false);
      } else {
        const r = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grupo: grupoId,
            mensagem,
            fallbackNome: usaNome ? fallbackNome : undefined,
            agendadoParaMs: dataHora?.toDate().getTime(),
          }),
        });
        if (!r.ok) {
          const corpo = await r.json().catch(() => ({}));
          addToast({ title: "Não consegui agendar", description: corpo.mensagem, color: "danger" });
          return;
        }
        setConfirmando(false);
        setMensagem("");
        addToast({ title: "Agendado", color: "success" });
      }
    } finally {
      setEnviando(false);
    }
  }

  if (erroGrupos) {
    return <p className="px-5 py-8 text-[15px] text-erro">{erroGrupos}</p>;
  }

  if (!grupos) {
    return (
      <div className="flex flex-col gap-4 px-5 py-8">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-preenchimento" />
        <div className="h-20 animate-pulse rounded-2xl bg-preenchimento" />
        <div className="h-40 animate-pulse rounded-2xl bg-preenchimento" />
      </div>
    );
  }

  // Enquanto um disparo esta em curso, a tela vira o acompanhamento dele.
  if (jobId) {
    return (
      <div className="flex flex-1 flex-col gap-7 px-5 pt-4 pb-6">
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold tracking-[.1em] text-tinta-fraca uppercase">
            {progresso?.status === "concluido" ? "Envio concluído" : "Enviando agora"}
          </div>
          <p className="text-[16px] font-semibold">{grupo?.label ?? "Disparo"}</p>
        </div>

        <PainelProgresso progresso={progresso} perdido={perdido} iniciadoEm={iniciadoEm} />

        {(progresso?.status === "concluido" || perdido) && (
          <button
            type="button"
            onClick={() => {
              setJobId(null);
              setIniciadoEm(null);
              setMensagem("");
            }}
            className="h-14 rounded-2xl border border-borda bg-superficie text-[16px] font-semibold text-vinho"
          >
            Escrever outro
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-5">
        <SeletorGrupo grupos={grupos} valor={grupoId} aoMudar={setGrupoId} />

        <EditorMensagem
          valor={mensagem}
          aoMudar={setMensagem}
          podeUsarNome={Boolean(grupo?.tem_nome)}
          fallbackNome={fallbackNome}
          aoMudarFallback={setFallbackNome}
          dicaFallback={dicaFallback}
        />

        {contatos > 0 && mensagem.trim().length > 0 && (
          <ContadorSegmentos texto={mensagem} contatos={contatos} />
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 bg-gradient-to-t from-fundo from-70% to-transparent px-5 pt-4 pb-3">
        <div className="flex gap-1 rounded-2xl bg-preenchimento p-1">
          {(["agora", "agendar"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setQuando(v)}
              className={`flex-1 rounded-xl py-2.5 text-[14px] ${
                quando === v
                  ? "bg-superficie font-semibold shadow-[0_1px_2px_rgba(46,30,30,.10)]"
                  : "text-tinta-suave"
              }`}
            >
              {v === "agora" ? "Agora" : "Agendar"}
            </button>
          ))}
        </div>

        {quando === "agendar" && (
          <DatePicker
            aria-label="Data e hora do agendamento"
            granularity="minute"
            value={dataHora}
            onChange={setDataHora}
          />
        )}

        <button
          type="button"
          disabled={!podeEnviar}
          onClick={() => setConfirmando(true)}
          className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-vinho text-[16px] font-semibold text-[#F9F6F2] shadow-[0_8px_20px_-8px_rgba(115,38,38,.7)] disabled:opacity-40 disabled:shadow-none"
        >
          <Send size={18} />
          {quando === "agendar"
            ? "Agendar envio"
            : totalSms > 0
              ? `Enviar ${totalSms} SMS`
              : "Enviar"}
        </button>
      </div>

      <FolhaConfirmacao
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={confirmar}
        grupoLabel={grupo?.label ?? ""}
        contatos={contatos}
        mensagem={mensagem}
        fallbackNome={fallbackNome}
        quando={
          quando === "agora"
            ? "envio imediato"
            : `agendado para ${dataHora?.toDate().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}`
        }
        enviando={enviando}
      />
    </div>
  );
}
