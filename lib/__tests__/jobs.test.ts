import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  abrirJob, jobExiste, definirTotal, registrarResultado, fecharJob, obterJob,
} from "@/lib/jobs";

const AGORA = 1_700_000_000_000;

describe("store de jobs", () => {
  // Congela o relogio em AGORA: varias chamadas abaixo omitem o parametro
  // "agora" de proposito (exercitam o default Date.now() dos caminhos de
  // leitura) e precisam de um "agora" real que coincida com o "agora"
  // logico do teste, nao o horario real de quando a suite roda.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("abre um job em andamento", () => {
    abrirJob("j-abre", "encontristas", AGORA);
    const j = obterJob("j-abre");
    expect(j?.status).toBe("enviando");
    expect(j?.enviados).toBe(0);
  });

  it("reconhece job existente — base da deduplicação de clique duplo", () => {
    abrirJob("j-dup", "encontristas", AGORA);
    expect(jobExiste("j-dup")).toBe(true);
    expect(jobExiste("j-inexistente")).toBe(false);
  });

  it("acumula enviados e falhas", () => {
    abrirJob("j-conta", "encontristas", AGORA);
    definirTotal("j-conta", 3, AGORA);
    registrarResultado("j-conta", true, AGORA);
    registrarResultado("j-conta", true, AGORA);
    registrarResultado("j-conta", false, AGORA);
    const j = obterJob("j-conta");
    expect(j).toMatchObject({ total: 3, enviados: 2, falhas: 1, status: "enviando" });
  });

  it("fecha o job com o resumo final", () => {
    abrirJob("j-fecha", "encontristas", AGORA);
    fecharJob("j-fecha", 9, 1, AGORA);
    expect(obterJob("j-fecha")).toMatchObject({ status: "concluido", enviados: 9, falhas: 1 });
  });

  it("ignora eventos de job inexistente em vez de explodir", () => {
    expect(() => registrarResultado("j-fantasma", true, AGORA)).not.toThrow();
    expect(() => fecharJob("j-fantasma", 1, 0, AGORA)).not.toThrow();
    expect(obterJob("j-fantasma")).toBeUndefined();
  });

  it("descarta job com mais de uma hora", () => {
    abrirJob("j-velho", "encontristas", AGORA);
    const duasHoras = 2 * 60 * 60 * 1000;
    expect(obterJob("j-velho", AGORA + duasHoras)).toBeUndefined();
  });
});
