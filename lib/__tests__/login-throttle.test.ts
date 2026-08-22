import { describe, it, expect, beforeEach } from "vitest";
import { atrasoDaProximaTentativa, registrarFalha, limparFalhas } from "@/lib/login-throttle";

const AGORA = 1_700_000_000_000;

describe("freio de login", () => {
  beforeEach(() => {
    limparFalhas();
  });

  it("não atrasa a primeira tentativa", () => {
    expect(atrasoDaProximaTentativa(AGORA)).toBe(0);
  });

  it("dobra o atraso a cada falha", () => {
    registrarFalha(AGORA);
    expect(atrasoDaProximaTentativa(AGORA)).toBe(1000);
    registrarFalha(AGORA);
    expect(atrasoDaProximaTentativa(AGORA)).toBe(2000);
    registrarFalha(AGORA);
    expect(atrasoDaProximaTentativa(AGORA)).toBe(4000);
  });

  it("respeita o teto de 30 segundos", () => {
    for (let i = 0; i < 20; i++) registrarFalha(AGORA);
    expect(atrasoDaProximaTentativa(AGORA)).toBe(30_000);
  });

  it("zera no login bem-sucedido", () => {
    for (let i = 0; i < 5; i++) registrarFalha(AGORA);
    limparFalhas();
    expect(atrasoDaProximaTentativa(AGORA)).toBe(0);
  });

  it("decai depois de 15 minutos sem falha", () => {
    for (let i = 0; i < 5; i++) registrarFalha(AGORA);
    expect(atrasoDaProximaTentativa(AGORA + 16 * 60 * 1000)).toBe(0);
  });

  it("não é burlável: não existe chave por cliente", () => {
    registrarFalha(AGORA);
    registrarFalha(AGORA);
    // Qualquer chamador vê o mesmo atraso — nao ha balde por IP para rotacionar.
    expect(atrasoDaProximaTentativa(AGORA)).toBe(2000);
  });
});
