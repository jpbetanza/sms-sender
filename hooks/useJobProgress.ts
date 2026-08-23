"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/jobs";

const INTERVALO_MS = 1500;
const LIMITE_MS = 30 * 60 * 1000;

export function useJobProgress(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
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
        if (r.status === 404) {
          setPerdido(true);
          return;
        }
        const j: Job = await r.json();
        if (!vivo) return;
        setJob(j);
        if (j.status !== "enviando") return;
      } catch {
        // rede instavel: ignora e tenta de novo no proximo tick
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

  return { job, perdido };
}
