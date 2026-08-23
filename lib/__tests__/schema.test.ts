import { describe, it, expect } from "vitest";
import {
  agendamentoSchema,
  agendarSchema,
  disparoSchema,
  enviarSchema,
  progressoDisparoSchema,
} from "@/lib/schema";

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

describe("agendamentoSchema", () => {
  it("normaliza o identificador numérico retornado pelo Data Table do n8n", () => {
    const resultado = agendamentoSchema.parse({
      id: 1,
      grupo: "Teste",
      mensagem: "Olá",
      agendado_para: "2026-08-23T14:30:06.826Z",
      agendado_para_ms: 1787495406826,
      status: "pendente",
    });

    expect(resultado.id).toBe("1");
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

describe("disparoSchema", () => {
  it("normaliza o identificador numérico retornado pelo Data Table do n8n", () => {
    const resultado = disparoSchema.parse({
      id: 5,
      job_id: "job-1",
      grupo: "Teste",
      mensagem: "Oi",
      origem: "imediato",
      iniciado_em: "2026-08-23T14:15:57.835Z",
      finalizado_em: "2026-08-23T14:16:00.528Z",
      total: 1,
      enviados: 1,
      falhas: 0,
    });

    expect(resultado.id).toBe("5");
  });

  it("normaliza contagens ausentes de linhas históricas antigas", () => {
    const resultado = disparoSchema.parse({
      id: 2,
      job_id: "manual-1",
      grupo: "teste",
      mensagem: "Teste manual",
      origem: "imediato",
      iniciado_em: "2026-08-22T10:35:08.349-03:00",
      finalizado_em: null,
      total: null,
      enviados: null,
      falhas: null,
    });

    expect(resultado).toMatchObject({ total: 0, enviados: 0, falhas: 0 });
  });
});
