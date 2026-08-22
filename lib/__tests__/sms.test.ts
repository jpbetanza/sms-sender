import { describe, it, expect } from "vitest";
import { contarSms } from "@/lib/sms";

const gsm = (n: number) => "a".repeat(n);

describe("contarSms", () => {
  it("trata texto vazio como zero segmentos", () => {
    const r = contarSms("");
    expect(r.segmentos).toBe(0);
    expect(r.alfabeto).toBe("GSM-7");
  });

  it("cabe em 1 segmento com exatamente 160 caracteres GSM", () => {
    const r = contarSms(gsm(160));
    expect(r.alfabeto).toBe("GSM-7");
    expect(r.limitePorSegmento).toBe(160);
    expect(r.segmentos).toBe(1);
  });

  it("vira 2 segmentos com 161 caracteres GSM", () => {
    const r = contarSms(gsm(161));
    expect(r.segmentos).toBe(2);
    expect(r.limitePorSegmento).toBe(153);
  });

  it("cai para UCS-2 quando ha acento fora do GSM-7", () => {
    const r = contarSms("Olá");
    expect(r.alfabeto).toBe("UCS-2");
    expect(r.limitePorSegmento).toBe(70);
    expect(r.segmentos).toBe(1);
    expect(r.foraDoGsm).toContain("á");
  });

  it("mantem GSM-7 com acentos que pertencem ao alfabeto", () => {
    const r = contarSms("à é ù ì ò Ç Ä Ö Ñ Ü ä ö ñ ü");
    expect(r.alfabeto).toBe("GSM-7");
  });

  it("conta caractere estendido como dois septetos", () => {
    const r = contarSms("[");
    expect(r.alfabeto).toBe("GSM-7");
    expect(r.caracteres).toBe(2);
  });

  it("cabe em 1 segmento com exatamente 70 caracteres UCS-2", () => {
    const r = contarSms("á".repeat(70));
    expect(r.segmentos).toBe(1);
  });

  it("vira 2 segmentos com 71 caracteres UCS-2", () => {
    const r = contarSms("á".repeat(71));
    expect(r.segmentos).toBe(2);
    expect(r.limitePorSegmento).toBe(67);
  });

  it("conta emoji fora do BMP como duas unidades UCS-2", () => {
    const r = contarSms("😀");
    expect(r.alfabeto).toBe("UCS-2");
    expect(r.caracteres).toBe(2);
  });
});
