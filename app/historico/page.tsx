"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Spinner } from "@heroui/spinner";
import type { Disparo } from "@/lib/schema";

export default function HistoricoPage() {
  const [itens, setItens] = useState<Disparo[] | null>(null);

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : []))
      .then(setItens);
  }, []);

  if (!itens)
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Table aria-label="Histórico de disparos">
        <TableHeader>
          <TableColumn>QUANDO</TableColumn>
          <TableColumn>GRUPO</TableColumn>
          <TableColumn>MENSAGEM</TableColumn>
          <TableColumn>RESULTADO</TableColumn>
        </TableHeader>
        <TableBody emptyContent="Nenhum disparo ainda.">
          {itens.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                {new Date(d.iniciado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </TableCell>
              <TableCell>{d.grupo}</TableCell>
              <TableCell className="max-w-xs truncate">{d.mensagem}</TableCell>
              <TableCell>
                {d.enviados} enviados
                {d.falhas > 0 && <span className="text-danger"> · {d.falhas} falhas</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
