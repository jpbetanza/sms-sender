"use client";

import { useEffect } from "react";

/** Registra recursos PWA somente em navegadores compatíveis e em produção. */
export function RegistroPwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch((erro: unknown) => {
      console.warn("Não foi possível registrar o service worker.", erro);
    });
  }, []);

  return null;
}
