"use client";

import { useEffect, useState } from "react";
import type { ProgressoDisparo } from "@/lib/schema";

const INTERVALO_MS = 2000;
const LIMITE_MS = 30 * 60 * 1000;

export function useJobProgress(jobId: string | null) {
  const [progresso, setProgresso] = useState<ProgressoDisparo | null>(null);
  const [perdido, setPerdido] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();

    async function tick() {
      if (!vivo) return;

      try {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        // 404 logo apos o disparo e esperado: a linha ainda nao foi criada.
        if (r.ok) {
          const p: ProgressoDisparo = await r.json();
          if (!vivo) return;
          setProgresso(p);
          if (p.status === "concluido") return;
        }
      } catch {
        // rede instavel: tenta de novo no proximo tick
      }

      if (Date.now() - inicio > LIMITE_MS) {
        setPerdido(true);
        return;
      }
      timer = setTimeout(tick, INTERVALO_MS);
    }

    timer = setTimeout(tick, 0);

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return { progresso, perdido };
}
