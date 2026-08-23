"use client";

import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import type { Job } from "@/lib/jobs";

export function PainelProgresso({ job, perdido }: { job: Job | null; perdido: boolean }) {
  if (perdido) {
    return (
      <Card>
        <CardBody className="text-sm text-muted-foreground">
          Perdi o acompanhamento deste envio. Ele pode ter continuado — confira no histórico.
        </CardBody>
      </Card>
    );
  }
  if (!job) return null;

  const processados = job.enviados + job.falhas;
  const valor = job.total > 0 ? (processados / job.total) * 100 : 0;

  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <Progress
          aria-label="Progresso do envio"
          value={valor}
          isIndeterminate={job.total === 0 && job.status === "enviando"}
          color={job.status === "erro" ? "danger" : "primary"}
        />
        <p className="text-sm">
          {job.status === "enviando"
            ? `${processados} de ${job.total || "…"} enviados`
            : `Concluído: ${job.enviados} enviados, ${job.falhas} falharam`}
        </p>
      </CardBody>
    </Card>
  );
}
