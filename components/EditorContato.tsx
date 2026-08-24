"use client";

/** Mascara progressiva (11) 98888-7777, igual ao placeholder. Digito puro decide o formato. */
export function mascararTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function EditorContato({
  telefone,
  aoMudarTelefone,
}: {
  telefone: string;
  aoMudarTelefone: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[11px] font-semibold tracking-[.1em] text-tinta-fraca uppercase">Para</div>
      <input
        type="tel"
        inputMode="tel"
        value={telefone}
        onChange={(e) => aoMudarTelefone(mascararTelefone(e.target.value))}
        placeholder="(11) 98888-7777"
        className="h-14 rounded-2xl border border-borda bg-superficie px-4 text-[16px] text-tinta outline-none placeholder:text-tinta-fraca"
      />
    </div>
  );
}
