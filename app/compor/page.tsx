"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { RadioGroup, Radio } from "@heroui/radio";
import { DatePicker } from "@heroui/date-picker";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import { now, getLocalTimeZone, type ZonedDateTime } from "@internationalized/date";
import type { Grupo } from "@/lib/schema";
import { SeletorGrupo } from "@/components/SeletorGrupo";
import { EditorMensagem } from "@/components/EditorMensagem";
import { ContadorSegmentos } from "@/components/ContadorSegmentos";
import { DialogoConfirmacao } from "@/components/DialogoConfirmacao";
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
  const podeEnviar =
    Boolean(grupoId) && mensagem.trim().length > 0 && (!usaNome || fallbackNome.trim().length > 0);

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
          // Ambiguidade real: nao afirmamos que falhou.
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

  if (erroGrupos) return <p className="p-8 text-danger">{erroGrupos}</p>;
  if (!grupos)
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <h1 className="font-serif text-xl">Enviar SMS</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <SeletorGrupo grupos={grupos} valor={grupoId} aoMudar={setGrupoId} />

          <EditorMensagem
            valor={mensagem}
            aoMudar={setMensagem}
            podeUsarNome={Boolean(grupo?.tem_nome)}
          />

          {usaNome && (
            <Input
              isRequired
              label="Sem nome, usar:"
              value={fallbackNome}
              onValueChange={setFallbackNome}
              description={
                grupo
                  ? grupo.sem_nome > 0
                    ? `${grupo.sem_nome} de ${grupo.count} contatos estão sem nome preenchido`
                    : "Todos os contatos têm nome — usado só se algum ficar em branco"
                  : undefined
              }
            />
          )}

          <ContadorSegmentos texto={mensagem} contatos={grupo?.count ?? 0} />

          <RadioGroup
            orientation="horizontal"
            value={quando}
            onValueChange={(v) => setQuando(v as "agora" | "agendar")}
          >
            <Radio value="agora">Enviar agora</Radio>
            <Radio value="agendar">Agendar</Radio>
          </RadioGroup>

          {quando === "agendar" && (
            <DatePicker
              label="Data e hora"
              granularity="minute"
              value={dataHora}
              onChange={setDataHora}
            />
          )}

          <Button color="primary" isDisabled={!podeEnviar} onPress={() => setConfirmando(true)}>
            {quando === "agora" ? "Enviar" : "Agendar"}
          </Button>
        </CardBody>
      </Card>

      <PainelProgresso progresso={progresso} perdido={perdido} aguardando={Boolean(jobId)} />

      <DialogoConfirmacao
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={confirmar}
        grupoLabel={grupo?.label ?? ""}
        contatos={grupo?.count ?? 0}
        mensagem={mensagem}
        quando={
          quando === "agora"
            ? "Envio imediato"
            : `Agendado para ${dataHora?.toDate().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
        }
        enviando={enviando}
      />
    </div>
  );
}
