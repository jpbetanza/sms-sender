"use client";

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
        onChange={(e) => aoMudarTelefone(e.target.value)}
        placeholder="(11) 98888-7777"
        className="h-14 rounded-2xl border border-borda bg-superficie px-4 text-[16px] text-tinta outline-none placeholder:text-tinta-fraca"
      />
    </div>
  );
}
