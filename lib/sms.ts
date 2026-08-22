/** Alfabeto GSM 03.38 basico. Note que 'a' acentuado, 'a' til, 'o' til e 'e' circunflexo NAO estao aqui. */
const GSM_BASICO =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** Caracteres que existem no GSM-7 mas custam dois septetos. */
const GSM_ESTENDIDO = "^{}\\[~]|€";

export type ContagemSms = {
  /** Septetos (GSM-7) ou unidades UTF-16 (UCS-2) — a unidade pela qual a operadora cobra. */
  caracteres: number;
  alfabeto: "GSM-7" | "UCS-2";
  limitePorSegmento: number;
  segmentos: number;
  /** Caracteres distintos que forcaram a queda para UCS-2. */
  foraDoGsm: string[];
};

export function contarSms(texto: string): ContagemSms {
  const foraDoGsm: string[] = [];
  let septetos = 0;

  for (const ch of texto) {
    if (GSM_BASICO.includes(ch)) {
      septetos += 1;
    } else if (GSM_ESTENDIDO.includes(ch)) {
      septetos += 2;
    } else if (!foraDoGsm.includes(ch)) {
      foraDoGsm.push(ch);
    }
  }

  if (texto.length === 0) {
    return { caracteres: 0, alfabeto: "GSM-7", limitePorSegmento: 160, segmentos: 0, foraDoGsm: [] };
  }

  if (foraDoGsm.length === 0) {
    const limitePorSegmento = septetos <= 160 ? 160 : 153;
    const segmentos = septetos <= 160 ? 1 : Math.ceil(septetos / 153);
    return { caracteres: septetos, alfabeto: "GSM-7", limitePorSegmento, segmentos, foraDoGsm };
  }

  // UCS-2 cobra por unidade UTF-16: emoji fora do BMP conta 2.
  const unidades = texto.length;
  const limitePorSegmento = unidades <= 70 ? 70 : 67;
  const segmentos = unidades <= 70 ? 1 : Math.ceil(unidades / 67);
  return { caracteres: unidades, alfabeto: "UCS-2", limitePorSegmento, segmentos, foraDoGsm };
}
