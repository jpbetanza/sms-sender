"use client";

import { contarSms } from "@/lib/sms";
import { AlertTriangle } from "lucide-react";

export function ContadorSegmentos({ texto, contatos }: { texto: string; contatos: number }) {
  const c = contarSms(texto);
  const totalSms = c.segmentos * contatos;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>
        {c.caracteres}/{c.limitePorSegmento} · {c.segmentos}{" "}
        {c.segmentos === 1 ? "segmento" : "segmentos"}
      </span>
      {contatos > 0 && <span className="font-medium text-foreground">= {totalSms} SMS</span>}
      {c.alfabeto === "UCS-2" && (
        <span className="flex items-center gap-1 text-warning-600">
          <AlertTriangle className="size-4" />
          acento ou emoji reduz o limite para 70 caracteres
        </span>
      )}
    </div>
  );
}
