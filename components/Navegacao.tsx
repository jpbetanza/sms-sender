"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, CalendarDays, Clock } from "lucide-react";

const ITENS = [
  { href: "/compor", label: "Enviar", Icone: Send },
  { href: "/agendados", label: "Agendados", Icone: CalendarDays },
  { href: "/historico", label: "Histórico", Icone: Clock },
];

export function Navegacao() {
  const atual = usePathname();
  if (atual === "/login") return null;

  return (
    <nav className="sticky bottom-0 flex border-t border-[var(--borda-suave)] bg-superficie px-3 pt-2.5 pb-6">
      {ITENS.map(({ href, label, Icone }) => {
        const ativo = atual === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1.5"
            style={{ color: ativo ? "var(--vinho)" : "var(--tinta-fraca)" }}
          >
            <Icone size={20} strokeWidth={2} />
            <span className={`text-[11px] ${ativo ? "font-semibold" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
