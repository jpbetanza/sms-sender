"use client";

import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import type { ProgressoDisparo } from "@/lib/schema";

export function PainelProgresso({
  progresso,
  perdido,
  aguardando,
}: {
  progresso: ProgressoDisparo | null;
  perdido: boolean;
  aguardando: boolean;
}) {
  if (perdido) {
    return (
      <Card>
        <CardBody className="text-sm text-muted-foreground">
          Perdi o acompanhamento deste envio. Ele pode ter continuado — confira no histórico.
        </CardBody>
      </Card>
    );
  }

  if (!progresso) {
    if (!aguardando) return null;
    return (
      <Card>
        <CardBody className="flex flex-col gap-2">
          <Progress aria-label="Iniciando envio" isIndeterminate color="primary" />
          <p className="text-sm">Iniciando envio…</p>
        </CardBody>
      </Card>
    );
  }

  const valor = progresso.total > 0 ? (progresso.processados / progresso.total) * 100 : 0;
  const concluido = progresso.status === "concluido";

  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <Progress
          aria-label="Progresso do envio"
          value={valor}
          isIndeterminate={progresso.total === 0 && !concluido}
          color="primary"
        />
        <p className="text-sm">
          {concluido
            ? `Concluído: ${progresso.enviados} enviados, ${progresso.falhas} falharam`
            : `${progresso.processados} de ${progresso.total || "…"} enviados`}
        </p>
      </CardBody>
    </Card>
  );
}
