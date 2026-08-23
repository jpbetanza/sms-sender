import { describe, it, expect } from "vitest";
import { enviarSchema, agendarSchema, progressoDisparoSchema } from "@/lib/schema";

describe("enviarSchema", () => {
  it("aceita envio simples", () => {
    const r = enviarSchema.safeParse({ grupo: "encontristas", mensagem: "Reunião às 19h" });
    expect(r.success).toBe(true);
  });

  it("recusa mensagem só com espaços", () => {
    const r = enviarSchema.safeParse({ grupo: "encontristas", mensagem: "   " });
    expect(r.success).toBe(false);
  });

  it("exige fallback quando a mensagem usa {{nome}}", () => {
    const r = enviarSchema.safeParse({ grupo: "encontristas", mensagem: "Olá {{nome}}" });
    expect(r.success).toBe(false);
  });

  it("aceita {{nome}} quando o fallback vem junto", () => {
    const r = enviarSchema.safeParse({
      grupo: "encontristas",
      mensagem: "Olá {{nome}}",
      fallbackNome: "amigo",
    });
    expect(r.success).toBe(true);
  });
});

describe("agendarSchema", () => {
  const daquiA = (ms: number) => Date.now() + ms;

  it("aceita agendamento a 10 minutos", () => {
    const r = agendarSchema.safeParse({
      grupo: "encontristas",
      mensagem: "Reunião",
      agendadoParaMs: daquiA(10 * 60 * 1000),
    });
    expect(r.success).toBe(true);
  });

  it("recusa agendamento no passado", () => {
    const r = agendarSchema.safeParse({
      grupo: "encontristas",
      mensagem: "Reunião",
      agendadoParaMs: daquiA(-60 * 1000),
    });
    expect(r.success).toBe(false);
  });

  it("recusa agendamento a menos de 2 minutos", () => {
    const r = agendarSchema.safeParse({
      grupo: "encontristas",
      mensagem: "Reunião",
      agendadoParaMs: daquiA(30 * 1000),
    });
    expect(r.success).toBe(false);
  });
});

describe("progressoDisparoSchema", () => {
  const base = { jobId: "j1", total: 10, processados: 4, enviados: 3, falhas: 1 };

  it("aceita um disparo em andamento", () => {
    expect(progressoDisparoSchema.safeParse({ ...base, status: "enviando" }).success).toBe(true);
  });

  it("aceita um disparo concluido", () => {
    expect(progressoDisparoSchema.safeParse({ ...base, status: "concluido" }).success).toBe(true);
  });

  it("recusa status desconhecido", () => {
    expect(progressoDisparoSchema.safeParse({ ...base, status: "outro" }).success).toBe(false);
  });

  it("recusa contagem negativa", () => {
    expect(
      progressoDisparoSchema.safeParse({ ...base, status: "enviando", processados: -1 }).success,
    ).toBe(false);
  });
});
