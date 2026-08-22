import { describe, it, expect } from "vitest";
import { criarToken, validarToken, senhaConfere } from "@/lib/session";

const SEGREDO = "segredo-de-teste";
const AGORA = 1_700_000_000_000;

describe("sessão", () => {
  it("aceita token recém-criado", async () => {
    const t = await criarToken(SEGREDO, AGORA);
    expect(await validarToken(t, SEGREDO, AGORA)).toBe(true);
  });

  it("rejeita token expirado", async () => {
    const t = await criarToken(SEGREDO, AGORA);
    const treze_horas = 13 * 60 * 60 * 1000;
    expect(await validarToken(t, SEGREDO, AGORA + treze_horas)).toBe(false);
  });

  it("rejeita token com validade adulterada", async () => {
    const t = await criarToken(SEGREDO, AGORA);
    const [, assinatura] = t.split(".");
    const forjado = `${AGORA + 99_999_999}.${assinatura}`;
    expect(await validarToken(forjado, SEGREDO, AGORA)).toBe(false);
  });

  it("rejeita token assinado com outro segredo", async () => {
    const t = await criarToken("outro-segredo", AGORA);
    expect(await validarToken(t, SEGREDO, AGORA)).toBe(false);
  });

  it("rejeita token ausente ou malformado", async () => {
    expect(await validarToken(undefined, SEGREDO, AGORA)).toBe(false);
    expect(await validarToken("sem-ponto", SEGREDO, AGORA)).toBe(false);
  });

  it("confere a senha correta", async () => {
    expect(await senhaConfere("abc123", "abc123", SEGREDO)).toBe(true);
  });

  it("recusa senha errada, inclusive de tamanho diferente", async () => {
    expect(await senhaConfere("abc", "abc123", SEGREDO)).toBe(false);
    expect(await senhaConfere("abc124", "abc123", SEGREDO)).toBe(false);
  });
});
