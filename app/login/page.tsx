"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        setErro(corpo.mensagem ?? "Não consegui entrar.");
        return;
      }
      router.push("/compor");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-vinho text-[#F9F6F2]">
      <div className="flex flex-1 flex-col justify-center gap-9 px-7">
        <div className="flex flex-col gap-2.5">
          <Send size={28} strokeWidth={1.6} color="var(--areia)" />
          <h1 className="fonte-titulo text-[40px] leading-[1.05] font-normal">
            Envio de
            <br />
            SMS
          </h1>
          <p className="text-[15px] text-[#D9C0C0]">Disparo por grupo</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 rounded-2xl border border-[rgba(232,213,196,.3)] bg-[rgba(249,246,242,.08)] px-4 py-3.5">
            <span className="text-[11px] tracking-[.08em] text-[#D9C0C0] uppercase">Senha</span>
            <input
              type="password"
              value={senha}
              autoComplete="current-password"
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") entrar();
              }}
              className="bg-transparent text-[18px] tracking-[.3em] text-[#F9F6F2] outline-none placeholder:text-[#C9A9A9]"
              placeholder="••••••••"
            />
          </label>

          {erro && <p className="text-[13px] text-[#F3C8C8]">{erro}</p>}

          <button
            type="button"
            onClick={entrar}
            disabled={carregando}
            className="h-14 rounded-2xl bg-[#F9F6F2] text-[16px] font-semibold text-vinho disabled:opacity-70"
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </div>
      <p className="px-7 pb-10 text-[12px] text-[#C9A9A9]">
        A sessão fica ativa por 12 horas neste aparelho
      </p>
    </div>
  );
}
