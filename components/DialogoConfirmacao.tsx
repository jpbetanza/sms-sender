"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { contarSms } from "@/lib/sms";

export function DialogoConfirmacao({
  aberto,
  aoFechar,
  aoConfirmar,
  grupoLabel,
  contatos,
  mensagem,
  quando,
  enviando,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  grupoLabel: string;
  contatos: number;
  mensagem: string;
  quando: string;
  enviando: boolean;
}) {
  const c = contarSms(mensagem);
  const totalSms = c.segmentos * contatos;

  return (
    <Modal isOpen={aberto} onClose={aoFechar}>
      <ModalContent>
        <ModalHeader className="font-serif">Confirmar envio</ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <p className="font-medium">
            {grupoLabel} · {contatos} contatos
          </p>
          <p className="rounded-medium bg-muted p-3 text-sm italic">{mensagem}</p>
          <p className="text-sm text-muted-foreground">
            {c.segmentos} {c.segmentos === 1 ? "segmento" : "segmentos"} × {contatos} contatos ={" "}
            <strong className="text-foreground">{totalSms} SMS</strong>
          </p>
          <p className="text-sm text-muted-foreground">{quando}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={aoFechar}>
            Cancelar
          </Button>
          <Button color="primary" isLoading={enviando} onPress={aoConfirmar}>
            Confirmar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
