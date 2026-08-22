import { describe, it, expect } from "vitest";
import { enviarSchema, agendarSchema, progressoSchema } from "@/lib/schema";

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

describe("progressoSchema", () => {
  it("aceita evento de início", () => {
    expect(progressoSchema.safeParse({ evento: "inicio", jobId: "j1", total: 10 }).success).toBe(true);
  });

  it("aceita evento de progresso", () => {
    expect(progressoSchema.safeParse({ evento: "progresso", jobId: "j1", ok: true }).success).toBe(true);
  });

  it("aceita evento de fim", () => {
    expect(
      progressoSchema.safeParse({ evento: "fim", jobId: "j1", enviados: 9, falhas: 1 }).success,
    ).toBe(true);
  });

  it("recusa evento desconhecido", () => {
    expect(progressoSchema.safeParse({ evento: "outro", jobId: "j1" }).success).toBe(false);
  });
});
