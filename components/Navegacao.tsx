"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const ITENS = [
  { href: "/compor", label: "Enviar" },
  { href: "/agendados", label: "Agendados" },
  { href: "/historico", label: "Histórico" },
];

export function Navegacao() {
  const atual = usePathname();
  if (atual === "/login") return null;

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-2xl gap-4 p-4">
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={clsx(
              "text-sm",
              atual === i.href ? "font-medium text-primary" : "text-muted-foreground",
            )}
          >
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
