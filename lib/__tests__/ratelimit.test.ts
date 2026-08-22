import { describe, it, expect, beforeEach } from "vitest";
import { podeTentar, registrarFalha, limparTentativas } from "@/lib/ratelimit";

const AGORA = 1_700_000_000_000;

describe("limitador de tentativas", () => {
  beforeEach(() => {
    limparTentativas("1.2.3.4");
  });

  it("permite as cinco primeiras tentativas", () => {
    for (let i = 0; i < 5; i++) {
      expect(podeTentar("1.2.3.4", AGORA)).toBe(true);
      registrarFalha("1.2.3.4", AGORA);
    }
    expect(podeTentar("1.2.3.4", AGORA)).toBe(false);
  });

  it("libera de novo depois da janela de 15 minutos", () => {
    for (let i = 0; i < 5; i++) registrarFalha("1.2.3.4", AGORA);
    expect(podeTentar("1.2.3.4", AGORA)).toBe(false);
    expect(podeTentar("1.2.3.4", AGORA + 16 * 60 * 1000)).toBe(true);
  });

  it("nao mistura IPs diferentes", () => {
    for (let i = 0; i < 5; i++) registrarFalha("1.2.3.4", AGORA);
    expect(podeTentar("9.9.9.9", AGORA)).toBe(true);
  });

  it("zera a contagem no login bem-sucedido", () => {
    for (let i = 0; i < 5; i++) registrarFalha("1.2.3.4", AGORA);
    limparTentativas("1.2.3.4");
    expect(podeTentar("1.2.3.4", AGORA)).toBe(true);
  });
});
