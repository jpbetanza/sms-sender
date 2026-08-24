import { describe, it, expect } from "vitest";
import { mascararTelefone } from "@/components/EditorContato";

describe("mascararTelefone", () => {
  it("formata progressivamente enquanto digita", () => {
    expect(mascararTelefone("1")).toBe("(1");
    expect(mascararTelefone("11")).toBe("(11");
    expect(mascararTelefone("119")).toBe("(11) 9");
    expect(mascararTelefone("1198888")).toBe("(11) 9888-8");
    expect(mascararTelefone("11988887777")).toBe("(11) 98888-7777");
  });

  it("usa o formato de fixo (4-4) até 10 dígitos", () => {
    expect(mascararTelefone("1133334444")).toBe("(11) 3333-4444");
  });

  it("ignora caracteres que não são dígitos ao reformatar um valor já mascarado", () => {
    expect(mascararTelefone("(11) 98888-7777")).toBe("(11) 98888-7777");
  });

  it("descarta dígitos além do 11º", () => {
    expect(mascararTelefone("119888877776666")).toBe("(11) 98888-7777");
  });

  it("retorna vazio para entrada vazia", () => {
    expect(mascararTelefone("")).toBe("");
  });
});
