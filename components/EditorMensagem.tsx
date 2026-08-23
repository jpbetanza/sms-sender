"use client";

import { Textarea } from "@heroui/input";
import { Button } from "@heroui/button";

export function EditorMensagem({
  valor,
  aoMudar,
  podeUsarNome,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  podeUsarNome: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        label="Mensagem"
        minRows={4}
        value={valor}
        onValueChange={aoMudar}
        placeholder="Escreva o comunicado"
      />
      {podeUsarNome && (
        <Button
          size="sm"
          variant="flat"
          className="self-start"
          onPress={() => aoMudar(`${valor}{{nome}}`)}
        >
          + {"{{nome}}"}
        </Button>
      )}
    </div>
  );
}
