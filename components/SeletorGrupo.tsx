"use client";

import { Select, SelectItem } from "@heroui/select";
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
    <Select
      label="Grupo"
      disabledKeys={grupos.filter((g) => g.erro).map((g) => g.id)}
      selectedKeys={valor ? [valor] : []}
      onSelectionChange={(chaves) => aoMudar(String(Array.from(chaves)[0] ?? ""))}
    >
      {grupos.map((g) => (
        <SelectItem
          key={g.id}
          textValue={g.erro ? `${g.label} (indisponível)` : `${g.label} (${g.count} contatos)`}
        >
          {g.erro ? (
            <span className="text-danger">
              {g.label} · {g.erro}
            </span>
          ) : (
            <>
              {g.label} · {g.count} contatos
            </>
          )}
        </SelectItem>
      ))}
    </Select>
  );
}
