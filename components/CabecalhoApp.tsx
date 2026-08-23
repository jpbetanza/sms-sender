"use client";

import { usePathname } from "next/navigation";
import pequenaViaIcon from "@/app/icon.png";

const TITULOS: Record<string, string> = {
  "/compor": "Novo comunicado",
  "/agendados": "Agendados",
  "/historico": "Histórico",
};

export function CabecalhoApp() {
  const pathname = usePathname();
  const titulo = TITULOS[pathname];

  if (!titulo) return null;

  return (
    <header className="relative flex h-16 flex-none items-center justify-center border-b border-borda-suave bg-superficie px-5">
      <img
        src={pequenaViaIcon.src}
        alt="PequenaVia SMS"
        width={36}
        height={36}
        className="absolute left-5 rounded-xl"
      />
      <h1 className="fonte-titulo text-[24px] font-normal">{titulo}</h1>
    </header>
  );
}
