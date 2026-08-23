"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import type { Agendamento } from "@/lib/schema";

const CORES: Record<
  Agendamento["status"],
  "default" | "primary" | "success" | "warning" | "danger"
> = {
  pendente: "primary",
  enviando: "warning",
  enviado: "success",
  perdido: "danger",
  cancelado: "default",
};

export default function AgendadosPage() {
  const [itens, setItens] = useState<Agendamento[] | null>(null);

  async function carregar() {
    const r = await fetch("/api/schedules", { cache: "no-store" });
    setItens(r.ok ? await r.json() : []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function cancelar(id: string) {
    const r = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      addToast({ title: "Não deu para cancelar", description: corpo.mensagem, color: "danger" });
    }
    carregar();
  }

  if (!itens)
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  if (itens.length === 0)
    return <p className="mx-auto max-w-2xl p-4 text-muted-foreground">Nenhum envio agendado.</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      {itens.map((a) => (
        <Card key={a.id}>
          <CardBody className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.grupo}</span>
                <Chip size="sm" color={CORES[a.status]} variant="flat">
                  {a.status}
                </Chip>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{a.mensagem}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(a.agendado_para_ms).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
            </div>
            {a.status === "pendente" && (
              <Button size="sm" color="danger" variant="light" onPress={() => cancelar(a.id)}>
                Cancelar
              </Button>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
