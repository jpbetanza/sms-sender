# SMS Sender — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma tela onde se escreve a mensagem, escolhe-se o grupo e dispara-se SMS — na hora ou agendado — com progresso ao vivo e histórico, tendo o n8n como motor de envio.

**Architecture:** O navegador nunca fala com o n8n: Route Handlers do Next injetam o token e são a única porta. O n8n concentra a lógica de envio num sub-workflow único, chamado tanto por webhook (imediato) quanto por Schedule Trigger (agendado), e persiste tudo em Data Tables — sem banco externo. Progresso ao vivo via callback do n8n para um store em memória do app.

**Tech Stack:** Next 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · **HeroUI v2** · next-themes · zod · Vitest · Playwright · n8n (Data Tables, Schedule Trigger, sub-workflows) · Zenvia SMS API · Google Sheets

**Spec:** `docs/superpowers/specs/2026-08-21-sms-sender-design.md`

## Global Constraints

- Runtime: Node 20.20.0, gerenciador `pnpm`.
- **Design system idêntico ao projeto `pequenavia`** (`/Users/jpbetanza/Projetos/pequenavia`). Ele é a referência viva: em caso de dúvida sobre padrão visual, leia o arquivo correspondente lá.
- **HeroUI v2, não v3.** Pacotes individuais (`@heroui/button`, `@heroui/input`, …) com `@heroui/system` ≥ 2.4 e `@heroui/theme` ≥ 2.4. **A skill `heroui-react` instalada localmente é v3-only e NÃO se aplica a este projeto** — ignorá-la.
- **`HeroUIProvider` é obrigatório** (v2), vindo de `@heroui/system`, com `ToastProvider` de `@heroui/toast`, dentro de `next-themes`.
- Tailwind CSS v4, carregando o tema por `@plugin '../hero.ts'` e `@source '../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'`.
- Dark mode por classe: `@custom-variant dark (&:is(.dark *))` e next-themes com `attribute: "class"`, `defaultTheme: "light"`.
- Paleta (copiada de `pequenavia/hero.ts`, valores exatos): light `primary #732626` sobre `background #F9F6F2`, foreground `#2E1E1E`; dark `primary #C45454` sobre `background #171111`, foreground `#EFECE9`. Radius `small .25rem` / `medium .5rem` / `large .75rem`.
- Fontes: Inter (`--font-sans`) e Playfair Display (`--font-playfair`) via `next/font/google`.
- Ícones: `lucide-react`. Utilitário de classes: `clsx`.
- Botões e itens interativos usam `onPress`, não `onClick`.
- TypeScript em `strict: true`.
- Toda a interface em português do Brasil.
- Datas: persistir em UTC (epoch ms + ISO-8601); exibir e receber em `America/Sao_Paulo`.
- n8n base URL: `https://webhooks.aotomatika.com.br`
- Zenvia: `POST https://api.zenvia.com/v2/channels/sms/messages`, Header Auth `X-API-TOKEN`, remetente `joao.pedro.betanza`.
- Planilha Google: documento `1X1fmj9BGzEc_RsSR0bVPsAWdF9FWi4Iiwyj7-3anKgU`.
- `Wait` de **100ms** entre envios dentro do loop.
- Hospedagem de **instância única** — é o que torna o store de progresso em memória correto.
- Autenticação App → n8n: header `X-APP-TOKEN`. n8n → App: header `X-CALLBACK-TOKEN`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/sms.ts` | Contagem de segmentos GSM-7/UCS-2. Puro, sem I/O. |
| `lib/phone.ts` | Normalização de telefone para E.164. Puro, sem I/O. |
| `lib/session.ts` | Token de sessão assinado (HMAC) e comparação de senha. |
| `lib/jobs.ts` | Store em memória do progresso, com TTL. |
| `lib/schema.ts` | Schemas zod compartilhados entre cliente e servidor. |
| `lib/n8n.ts` | Único cliente HTTP do n8n: token, timeout, erros tipados. |
| `middleware.ts` | Barra rotas sem sessão, exceto `/login` e `/api/progress`. |
| `app/api/*/route.ts` | Um handler por recurso; validam com `lib/schema.ts`. |
| `components/*.tsx` | Componentes de tela, um arquivo por responsabilidade. |
| `hooks/useJobProgress.ts` | Polling do progresso, com parada automática. |

Regra que atravessa o plano: **nenhum arquivo além de `lib/n8n.ts` chama o n8n**, e **nenhum componente calcula segmento ou normaliza telefone** — isso vive em `lib/`, testado isoladamente.

---

### Task 1: Fundação do projeto e design system

Esta tarefa reproduz o design system do `pequenavia`. Os arquivos de referência a consultar são
`pequenavia/hero.ts`, `pequenavia/styles/globals.css`, `pequenavia/app/providers.tsx`,
`pequenavia/config/fonts.ts` e `pequenavia/app/layout.tsx`.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `hero.ts`, `styles/globals.css`, `config/fonts.ts`, `app/providers.tsx`, `app/layout.tsx`, `app/page.tsx`, `vitest.config.ts`, `.env.example`
- Test: `lib/__tests__/fundacao.test.ts`

**Interfaces:**
- Consumes: nada (primeira tarefa).
- Produces: projeto Next executável (`pnpm dev`), `pnpm test` rodando Vitest, e o tema HeroUI v2 do `pequenavia` disponível para todas as telas (Tasks 12–15).

- [ ] **Step 1: Criar o projeto Next na raiz do repositório**

O diretório já contém `.git/` e `docs/` — ambos estão na lista de arquivos tolerados pelo `create-next-app`.

```bash
cd /Users/jpbetanza/Projetos/sms-sender
pnpm dlx create-next-app@latest . --ts --app --no-src-dir --no-tailwind --eslint --import-alias "@/*" --use-pnpm
```

Se ele recusar por conflito de arquivos, crie em `../sms-sender-tmp` e mova o conteúdo (menos `.git`) para cá.

- [ ] **Step 2: Instalar HeroUI v2, Tailwind v4 e ferramentas**

Pacotes individuais, como no `pequenavia` — não existe `@heroui/react` neste arranjo:

```bash
pnpm add @heroui/system @heroui/theme @heroui/button @heroui/input @heroui/select \
  @heroui/card @heroui/modal @heroui/progress @heroui/chip @heroui/table @heroui/form \
  @heroui/spinner @heroui/toast @heroui/divider @heroui/date-picker @heroui/radio \
  @heroui/tooltip @heroui/skeleton
pnpm add framer-motion next-themes lucide-react clsx tailwind-merge tailwind-variants \
  @internationalized/date zod
pnpm add tailwindcss @tailwindcss/postcss postcss
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Verifique que caiu na v2:

```bash
node -e "const p=require('./package.json');console.log(p.dependencies['@heroui/system'], p.dependencies['@heroui/theme'])"
```

Expected: dois números começando em `2.4` ou maior. Se aparecer `3.x`, pare — v3 tem API incompatível com este plano.

- [ ] **Step 3: Configurar PostCSS**

`postcss.config.mjs`:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 4: Criar o tema — cópia fiel do `pequenavia/hero.ts`**

`hero.ts` na raiz:

```ts
import { heroui } from "@heroui/theme";

export default heroui({
  themes: {
    light: {
      colors: {
        background: "#F9F6F2",
        foreground: "#2E1E1E",
        primary: { DEFAULT: "#732626", foreground: "#F9F6F2" },
        secondary: { DEFAULT: "#EFEBE6", foreground: "#2E1E1E" },
        focus: "#732626",
        danger: { DEFAULT: "#DC2626", foreground: "#F9F6F2" },
      },
      layout: {
        radius: { small: "0.25rem", medium: "0.5rem", large: "0.75rem" },
      },
    },
    dark: {
      colors: {
        background: "#171111",
        foreground: "#EFECE9",
        primary: { DEFAULT: "#C45454", foreground: "#171111" },
        secondary: { DEFAULT: "#2C2525", foreground: "#EFECE9" },
        focus: "#C45454",
        danger: { DEFAULT: "#DC2626", foreground: "#EFECE9" },
      },
      layout: {
        radius: { small: "0.25rem", medium: "0.5rem", large: "0.75rem" },
      },
    },
  },
});
```

- [ ] **Step 5: Criar o CSS global — cópia fiel do `pequenavia/styles/globals.css`**

`styles/globals.css`. O `@source` não é decorativo: sem ele o Tailwind v4 não varre as classes do HeroUI e os componentes saem sem estilo.

```css
@import "tailwindcss";

@plugin '../hero.ts';

@source '../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';

@custom-variant dark (&:is(.dark *));

@theme {
    --font-sans: "font", sans-serif;
    --font-mono: "monospace", monospace;

    /* Custom Tokens */
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-border: var(--border);
    --color-ring: var(--ring);
}

:root {
  --accent: #E8D5C4;
  --accent-foreground: #2E1F1F;
  --card: #FCFAF8;
  --card-foreground: #2D1F1F;
  --popover: #FCFAF8;
  --popover-foreground: #2D1F1F;
  --muted: #EDEBE8;
  --muted-foreground: #6E6560;
  --destructive: #DC2626;
  --destructive-foreground: #F9F6F2;
  --border: #DDD7D0;
  --ring: #732626;
}

.dark {
  --accent: #2D2424;
  --accent-foreground: #EFECE9;
  --card: #1C1616;
  --card-foreground: #EFECE9;
  --popover: #1C1616;
  --popover-foreground: #EFECE9;
  --muted: #2C2525;
  --muted-foreground: #EFECE9;
  --destructive: #DC2626;
  --destructive-foreground: #EFECE9;
  --border: #2C2525;
  --ring: #C45454;
}
```

- [ ] **Step 6: Configurar as fontes**

`config/fonts.ts`:

```ts
import { Inter as FontSans, Playfair_Display as FontSerif } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontSerif = FontSerif({
  subsets: ["latin"],
  variable: "--font-playfair",
});
```

- [ ] **Step 7: Criar os Providers (v2 exige `HeroUIProvider`)**

`app/providers.tsx`:

```tsx
"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        {children}
        <ToastProvider />
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
```

- [ ] **Step 8: Montar o layout raiz**

`app/layout.tsx`:

```tsx
import "@/styles/globals.css";
import type { Metadata } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { fontSans, fontSerif } from "@/config/fonts";

export const metadata: Metadata = {
  title: { default: "Envio de SMS", template: "%s - Envio de SMS" },
  description: "Disparo de SMS por grupo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <head />
      <body
        suppressHydrationWarning
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontSerif.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex flex-col min-h-screen">
            <main className="flex-grow">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Configurar o Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
```

Adicione ao `package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 10: Escrever o teste de fumaça**

`lib/__tests__/fundacao.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("fundação", () => {
  it("roda o Vitest com alias @ configurado", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 11: Rodar o teste**

Run: `pnpm test`
Expected: PASS — 1 teste, 1 arquivo.

- [ ] **Step 12: Verificar o tema visualmente**

Coloque em `app/page.tsx` um botão temporário e suba o servidor:

```tsx
import { Button } from "@heroui/button";

export default function Home() {
  return (
    <div className="p-8">
      <Button color="primary">Botão de teste</Button>
    </div>
  );
}
```

Run: `pnpm dev` e abra `http://localhost:3000`
Expected: botão em bordô `#732626` sobre fundo creme `#F9F6F2`. Se o botão sair sem estilo, o `@source` do `globals.css` está errado.

- [ ] **Step 13: Verificar o build**

Run: `pnpm build`
Expected: build conclui sem erro de TypeScript nem de PostCSS.

- [ ] **Step 14: Criar `.env.example`**

```bash
APP_PASSWORD=troque-esta-senha
SESSION_SECRET=gere-com-openssl-rand-base64-32
N8N_BASE_URL=https://webhooks.aotomatika.com.br
N8N_APP_TOKEN=token-compartilhado-com-o-n8n
APP_CALLBACK_TOKEN=token-que-o-n8n-usa-para-reportar-progresso
APP_PUBLIC_URL=https://sms.exemplo.com.br
```

Confirme que `.gitignore` contém `.env` e `.env.local`.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "chore: fundacao do projeto com design system do pequenavia (heroui v2, tailwind v4)"
```

---

### Task 2: Contagem de segmentos SMS

Onde o custo real da mensagem é calculado. `ã`, `á`, `õ`, `ê` **não pertencem** ao GSM-7 — praticamente toda mensagem em português cai para 70 caracteres por segmento, dobrando a cobrança sem aviso.

**Files:**
- Create: `lib/sms.ts`
- Test: `lib/__tests__/sms.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `contarSms(texto: string): ContagemSms` e o tipo `ContagemSms`, usados pela UI (Task 13) e pela validação do envio (Task 11).

- [ ] **Step 1: Escrever os testes que falham**

`lib/__tests__/sms.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/sms.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/sms"`.

- [ ] **Step 3: Implementar**

`lib/sms.ts`:

```ts
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
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm test lib/__tests__/sms.test.ts`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/sms.ts lib/__tests__/sms.test.ts
git commit -m "feat: contagem de segmentos SMS (GSM-7/UCS-2)"
```

---

### Task 3: Normalização de telefone

O workflow atual manda `String($json.telefone)` cru da planilha para a Zenvia. Célula com máscara, espaço sobrando ou número de fixo vira falha silenciosa contada como envio.

> **Ponto de decisão do dono do projeto.** A implementação abaixo funciona e é a recomendação padrão, mas três regras são julgamento de domínio, não técnica: (a) prefixar `9` em celular de 8 dígitos, (b) rejeitar telefone fixo em vez de tentar enviar, (c) rejeitar número sem DDD em vez de assumir um. Se o dono decidir diferente, ajuste os testes **antes** da implementação.

**Files:**
- Create: `lib/phone.ts`
- Test: `lib/__tests__/phone.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `normalizarTelefone(bruto: string): ResultadoTelefone`. Consumido pelo nó `Normalizar Contatos` do n8n (Task 8), que replica esta regra em JavaScript dentro de um nó Code.

- [ ] **Step 1: Escrever os testes que falham**

`lib/__tests__/phone.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizarTelefone } from "@/lib/phone";

describe("normalizarTelefone", () => {
  it("aceita celular com mascara", () => {
    expect(normalizarTelefone("(11) 99999-9999")).toEqual({ ok: true, e164: "5511999999999" });
  });

  it("aceita numero que ja vem com 55", () => {
    expect(normalizarTelefone("5511999999999")).toEqual({ ok: true, e164: "5511999999999" });
  });

  it("aceita +55 com espacos", () => {
    expect(normalizarTelefone(" +55 11 99999 9999 ")).toEqual({ ok: true, e164: "5511999999999" });
  });

  it("prefixa o nono digito em celular de 8 digitos", () => {
    expect(normalizarTelefone("11 9999-9999")).toEqual({ ok: true, e164: "5511999999999" });
  });

  it("rejeita telefone fixo, que nao recebe SMS", () => {
    expect(normalizarTelefone("(11) 3333-4444")).toEqual({ ok: false, motivo: "fixo" });
  });

  it("rejeita celula vazia", () => {
    expect(normalizarTelefone("   ")).toEqual({ ok: false, motivo: "vazio" });
  });

  it("rejeita texto sem digitos", () => {
    expect(normalizarTelefone("nao tem")).toEqual({ ok: false, motivo: "vazio" });
  });

  it("rejeita numero curto demais", () => {
    expect(normalizarTelefone("11 9999")).toEqual({ ok: false, motivo: "curto" });
  });

  it("rejeita numero longo demais", () => {
    expect(normalizarTelefone("5511999999999999")).toEqual({ ok: false, motivo: "longo" });
  });

  it("rejeita DDD inexistente", () => {
    expect(normalizarTelefone("0199999999999".slice(0, 11))).toEqual({ ok: false, motivo: "ddd" });
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/phone.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/phone"`.

- [ ] **Step 3: Implementar**

`lib/phone.ts`:

```ts
export type MotivoDescarte = "vazio" | "curto" | "longo" | "ddd" | "fixo";

export type ResultadoTelefone =
  | { ok: true; e164: string }
  | { ok: false; motivo: MotivoDescarte };

export function normalizarTelefone(bruto: string): ResultadoTelefone {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos.length === 0) return { ok: false, motivo: "vazio" };

  // Remove o codigo do pais so quando sobra numero nacional plausivel.
  let nacional = digitos;
  if (nacional.startsWith("55") && nacional.length >= 12) {
    nacional = nacional.slice(2);
  }

  if (nacional.length < 10) return { ok: false, motivo: "curto" };
  if (nacional.length > 11) return { ok: false, motivo: "longo" };

  const ddd = nacional.slice(0, 2);
  if (Number(ddd) < 11 || Number(ddd) > 99) return { ok: false, motivo: "ddd" };

  let assinante = nacional.slice(2);

  // Celular antigo de 8 digitos: comeca em 6-9 e ganha o nono digito.
  if (assinante.length === 8 && /^[6-9]/.test(assinante)) {
    assinante = "9" + assinante;
  }

  // Fixo (8 digitos comecando em 2-5) nao recebe SMS.
  if (assinante.length === 8) return { ok: false, motivo: "fixo" };
  if (assinante.length !== 9 || !/^9/.test(assinante)) return { ok: false, motivo: "fixo" };

  return { ok: true, e164: `55${ddd}${assinante}` };
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm test lib/__tests__/phone.test.ts`
Expected: PASS — 10 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/phone.ts lib/__tests__/phone.test.ts
git commit -m "feat: normalizacao de telefone para E.164"
```

---
### Task 4: Sessão, login e middleware

Senha única sem limitador é alvo confortável para força bruta, porque não há usuário a bloquear.

**Files:**
- Create: `lib/session.ts`, `lib/ratelimit.ts`, `middleware.ts`, `app/api/login/route.ts`
- Test: `lib/__tests__/session.test.ts`, `lib/__tests__/ratelimit.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `criarToken(segredo, agora?): Promise<string>`, `validarToken(token, segredo, agora?): Promise<boolean>`, `senhaConfere(entrada, esperada, segredo): Promise<boolean>`, `podeTentar(ip, agora?): boolean`, `registrarFalha(ip, agora?): void`, `limparTentativas(ip): void`. O middleware protege todas as rotas das Tasks 11 e 12–15.

> **Atenção de runtime:** o middleware do Next roda no Edge, onde `node:crypto` não existe. Por isso `lib/session.ts` usa **Web Crypto** (`crypto.subtle`), que funciona nos dois runtimes — e por isso as funções são assíncronas.

- [ ] **Step 1: Escrever os testes de sessão que falham**

`lib/__tests__/session.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/session.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/session"`.

- [ ] **Step 3: Implementar a sessão**

`lib/session.ts`:

```ts
const DOZE_HORAS_MS = 12 * 60 * 60 * 1000;
const enc = new TextEncoder();

async function chaveHmac(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function assinar(payload: string, segredo: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await chaveHmac(segredo), enc.encode(payload));
  return base64url(new Uint8Array(sig));
}

/** Comparacao de tempo constante. So use com strings de mesmo comprimento (hashes). */
export function comparaSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function criarToken(segredo: string, agora: number = Date.now()): Promise<string> {
  const exp = String(agora + DOZE_HORAS_MS);
  return `${exp}.${await assinar(exp, segredo)}`;
}

export async function validarToken(
  token: string | undefined,
  segredo: string,
  agora: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [exp, assinatura] = partes;
  // A assinatura e conferida antes da validade: sem isso, exp seria forjavel.
  if (!comparaSegura(await assinar(exp, segredo), assinatura)) return false;
  const limite = Number(exp);
  return Number.isFinite(limite) && limite > agora;
}

/**
 * Compara senhas pelos HMACs, nao pelos textos: assim o tempo de resposta
 * nao revela o comprimento da senha correta.
 */
export async function senhaConfere(
  entrada: string,
  esperada: string,
  segredo: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([assinar(entrada, segredo), assinar(esperada, segredo)]);
  return comparaSegura(a, b);
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm test lib/__tests__/session.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Escrever os testes do limitador**

`lib/__tests__/ratelimit.test.ts`:

```ts
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
```

- [ ] **Step 6: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/ratelimit.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/ratelimit"`.

- [ ] **Step 7: Implementar o limitador**

`lib/ratelimit.ts`:

```ts
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS = 5;

type Registro = { falhas: number; primeiraEm: number };

const porIp = new Map<string, Registro>();

export function podeTentar(ip: string, agora: number = Date.now()): boolean {
  const r = porIp.get(ip);
  if (!r) return true;
  if (agora - r.primeiraEm > JANELA_MS) {
    porIp.delete(ip);
    return true;
  }
  return r.falhas < MAX_FALHAS;
}

export function registrarFalha(ip: string, agora: number = Date.now()): void {
  const r = porIp.get(ip);
  if (!r || agora - r.primeiraEm > JANELA_MS) {
    porIp.set(ip, { falhas: 1, primeiraEm: agora });
    return;
  }
  r.falhas += 1;
}

export function limparTentativas(ip: string): void {
  porIp.delete(ip);
}
```

- [ ] **Step 8: Rodar até passar**

Run: `pnpm test lib/__tests__/ratelimit.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 9: Criar a rota de login**

`app/api/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { criarToken, senhaConfere } from "@/lib/session";
import { podeTentar, registrarFalha, limparTentativas } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";

  if (!podeTentar(ip)) {
    return NextResponse.json(
      { erro: "muitas_tentativas", mensagem: "Muitas tentativas. Tente de novo em 15 minutos." },
      { status: 429 },
    );
  }

  const corpo = await req.json().catch(() => ({}));
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";

  const segredo = process.env.SESSION_SECRET;
  const esperada = process.env.APP_PASSWORD;
  if (!segredo || !esperada) {
    return NextResponse.json({ erro: "config_ausente" }, { status: 500 });
  }

  if (!(await senhaConfere(senha, esperada, segredo))) {
    registrarFalha(ip);
    return NextResponse.json(
      { erro: "senha_invalida", mensagem: "Senha incorreta." },
      { status: 401 },
    );
  }

  limparTentativas(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sessao", await criarToken(segredo), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}
```

- [ ] **Step 10: Criar o middleware**

`middleware.ts` na raiz. `/api/progress` fica de fora porque quem chama é o n8n, não o navegador — ela tem token próprio (Task 6).

```ts
import { NextResponse, type NextRequest } from "next/server";
import { validarToken } from "@/lib/session";

const PUBLICAS = ["/login", "/api/login", "/api/progress"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const segredo = process.env.SESSION_SECRET ?? "";
  const token = req.cookies.get("sessao")?.value;

  if (await validarToken(token, segredo)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 11: Verificar manualmente**

```bash
pnpm dev
```

Em outro terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/groups
```

Expected: `401`.

```bash
curl -s -X POST http://localhost:3000/api/login -H 'Content-Type: application/json' -d '{"senha":"errada"}' -w "\n%{http_code}\n"
```

Expected: corpo com `"senha_invalida"` e status `401`.

- [ ] **Step 12: Commit**

```bash
git add lib/session.ts lib/ratelimit.ts middleware.ts app/api/login/route.ts lib/__tests__/session.test.ts lib/__tests__/ratelimit.test.ts
git commit -m "feat: sessao com senha unica, limitador de tentativas e middleware"
```

---

### Task 5: Contrato (zod) e cliente do n8n

**Files:**
- Create: `lib/schema.ts`, `lib/n8n.ts`
- Test: `lib/__tests__/schema.test.ts`, `lib/__tests__/n8n.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `grupoSchema`/`Grupo`, `enviarSchema`, `agendarSchema`, `progressoSchema`, `chamarN8n<T>(caminho, corpo, timeoutMs?)`, e as classes `N8nIndisponivel` e `N8nErro`. Tudo consumido pelas rotas da Task 11 e pela UI das Tasks 13–15.

- [ ] **Step 1: Escrever os testes de schema que falham**

`lib/__tests__/schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/schema.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/schema"`.

- [ ] **Step 3: Implementar os schemas**

`lib/schema.ts`. Note que `baseEnvio` é declarado antes de qualquer `.refine`: `refine` devolve `ZodEffects`, que não tem `.extend`.

```ts
import { z } from "zod";

export const grupoSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  tem_nome: z.boolean(),
  sem_nome: z.number().int().nonnegative(),
  /** Preenchido quando a aba da planilha nao pode ser lida (renomeada, removida, sem permissao). */
  erro: z.string().nullable().optional(),
});
export type Grupo = z.infer<typeof grupoSchema>;

export const gruposSchema = z.array(grupoSchema);

const baseEnvio = z.object({
  grupo: z.string().min(1, "Escolha um grupo"),
  mensagem: z.string().trim().min(1, "Escreva a mensagem"),
  fallbackNome: z.string().trim().min(1).optional(),
});

const exigeFallback = (v: z.infer<typeof baseEnvio>) =>
  !v.mensagem.includes("{{nome}}") || Boolean(v.fallbackNome);

const erroFallback = {
  message: "Informe o texto a usar quando o contato não tiver nome",
  path: ["fallbackNome"] as const,
};

export const enviarSchema = baseEnvio.refine(exigeFallback, erroFallback);
export type EnviarInput = z.infer<typeof enviarSchema>;

const MINIMO_ADIANTAMENTO_MS = 2 * 60 * 1000;

export const agendarSchema = baseEnvio
  .extend({ agendadoParaMs: z.number().int() })
  .refine(exigeFallback, erroFallback)
  .refine((v) => v.agendadoParaMs > Date.now() + MINIMO_ADIANTAMENTO_MS, {
    message: "Agende para pelo menos 2 minutos à frente",
    path: ["agendadoParaMs"],
  });
export type AgendarInput = z.infer<typeof agendarSchema>;

export const progressoSchema = z.discriminatedUnion("evento", [
  z.object({ evento: z.literal("inicio"), jobId: z.string().min(1), total: z.number().int().nonnegative() }),
  z.object({ evento: z.literal("progresso"), jobId: z.string().min(1), ok: z.boolean() }),
  z.object({
    evento: z.literal("fim"),
    jobId: z.string().min(1),
    enviados: z.number().int().nonnegative(),
    falhas: z.number().int().nonnegative(),
  }),
]);
export type ProgressoInput = z.infer<typeof progressoSchema>;

export const agendamentoSchema = z.object({
  id: z.string(),
  grupo: z.string(),
  mensagem: z.string(),
  agendado_para: z.string(),
  agendado_para_ms: z.number(),
  status: z.enum(["pendente", "enviando", "enviado", "perdido", "cancelado"]),
});
export type Agendamento = z.infer<typeof agendamentoSchema>;

export const disparoSchema = z.object({
  id: z.string(),
  job_id: z.string().nullable(),
  grupo: z.string(),
  mensagem: z.string(),
  origem: z.enum(["imediato", "agendado"]),
  iniciado_em: z.string(),
  finalizado_em: z.string().nullable(),
  total: z.number().int(),
  enviados: z.number().int(),
  falhas: z.number().int(),
});
export type Disparo = z.infer<typeof disparoSchema>;
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm test lib/__tests__/schema.test.ts`
Expected: PASS — 11 testes.

- [ ] **Step 5: Escrever os testes do cliente n8n**

`lib/__tests__/n8n.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chamarN8n, N8nIndisponivel, N8nErro } from "@/lib/n8n";

beforeEach(() => {
  process.env.N8N_BASE_URL = "https://n8n.exemplo";
  process.env.N8N_APP_TOKEN = "token-secreto";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chamarN8n", () => {
  it("envia o token no header e devolve o JSON", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await chamarN8n<{ ok: boolean }>("sms-consultas", { action: "grupos" });

    expect(r).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://n8n.exemplo/webhook/sms-consultas");
    expect((init as RequestInit).headers).toMatchObject({ "X-APP-TOKEN": "token-secreto" });
  });

  it("transforma status de erro em N8nErro com o código", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nao autorizado", { status: 403 })));
    await expect(chamarN8n("sms-consultas", {})).rejects.toBeInstanceOf(N8nErro);
  });

  it("transforma falha de rede em N8nIndisponivel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    await expect(chamarN8n("sms-consultas", {})).rejects.toBeInstanceOf(N8nIndisponivel);
  });

  it("aborta por timeout e reporta indisponibilidade", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    ));
    await expect(chamarN8n("sms-consultas", {}, 20)).rejects.toBeInstanceOf(N8nIndisponivel);
  });

  it("falha claramente se a configuração estiver ausente", async () => {
    delete process.env.N8N_APP_TOKEN;
    await expect(chamarN8n("sms-consultas", {})).rejects.toBeInstanceOf(N8nIndisponivel);
  });
});
```

- [ ] **Step 6: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/n8n.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/n8n"`.

- [ ] **Step 7: Implementar o cliente**

`lib/n8n.ts` — o único arquivo do projeto que chama o n8n:

```ts
export class N8nIndisponivel extends Error {
  constructor(motivo: string) {
    super(`n8n indisponível: ${motivo}`);
    this.name = "N8nIndisponivel";
  }
}

export class N8nErro extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
    this.name = "N8nErro";
  }
}

const TIMEOUT_PADRAO_MS = 15_000;

export async function chamarN8n<T>(
  caminho: string,
  corpo: unknown,
  timeoutMs: number = TIMEOUT_PADRAO_MS,
): Promise<T> {
  const base = process.env.N8N_BASE_URL;
  const token = process.env.N8N_APP_TOKEN;
  if (!base || !token) {
    throw new N8nIndisponivel("N8N_BASE_URL ou N8N_APP_TOKEN não configurado");
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);

  try {
    const resposta = await fetch(`${base}/webhook/${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-APP-TOKEN": token },
      body: JSON.stringify(corpo),
      signal: controle.signal,
      cache: "no-store",
    });

    if (!resposta.ok) {
      throw new N8nErro(`n8n respondeu ${resposta.status}`, resposta.status);
    }

    return (await resposta.json()) as T;
  } catch (e) {
    if (e instanceof N8nErro) throw e;
    throw new N8nIndisponivel(e instanceof Error ? e.message : "falha desconhecida");
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 8: Rodar até passar**

Run: `pnpm test lib/__tests__/n8n.test.ts`
Expected: PASS — 5 testes.

- [ ] **Step 9: Commit**

```bash
git add lib/schema.ts lib/n8n.ts lib/__tests__/schema.test.ts lib/__tests__/n8n.test.ts
git commit -m "feat: contrato zod compartilhado e cliente unico do n8n"
```

---

### Task 6: Store de progresso e rotas de acompanhamento

O store em memória é correto **porque a hospedagem é de instância única** (ver Restrição Conhecida no spec).

**Files:**
- Create: `lib/jobs.ts`, `app/api/progress/route.ts`, `app/api/jobs/[jobId]/route.ts`
- Test: `lib/__tests__/jobs.test.ts`

**Interfaces:**
- Consumes: `progressoSchema` (Task 5).
- Produces: `abrirJob(jobId, grupo, agora?)`, `jobExiste(jobId)`, `definirTotal(jobId, total)`, `registrarResultado(jobId, ok)`, `fecharJob(jobId, enviados, falhas)`, `marcarErro(jobId)`, `obterJob(jobId)`, o tipo `Job`. Consumidos por `/api/send` (Task 11) e pelo hook `useJobProgress` (Task 14).

- [ ] **Step 1: Escrever os testes que falham**

`lib/__tests__/jobs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  abrirJob, jobExiste, definirTotal, registrarResultado, fecharJob, obterJob,
} from "@/lib/jobs";

const AGORA = 1_700_000_000_000;

describe("store de jobs", () => {
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pnpm test lib/__tests__/jobs.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/jobs"`.

- [ ] **Step 3: Implementar o store**

`lib/jobs.ts`:

```ts
export type StatusJob = "enviando" | "concluido" | "erro";

export type Job = {
  jobId: string;
  grupo: string;
  total: number;
  enviados: number;
  falhas: number;
  status: StatusJob;
  criadoEm: number;
  atualizadoEm: number;
};

const TTL_MS = 60 * 60 * 1000;
const jobs = new Map<string, Job>();

/** Varredura preguicosa: evita manter um timer vivo so para limpar memoria. */
function limparExpirados(agora: number): void {
  for (const [id, j] of jobs) {
    if (agora - j.criadoEm > TTL_MS) jobs.delete(id);
  }
}

export function abrirJob(jobId: string, grupo: string, agora: number = Date.now()): Job {
  limparExpirados(agora);
  const job: Job = {
    jobId, grupo, total: 0, enviados: 0, falhas: 0,
    status: "enviando", criadoEm: agora, atualizadoEm: agora,
  };
  jobs.set(jobId, job);
  return job;
}

export function jobExiste(jobId: string, agora: number = Date.now()): boolean {
  limparExpirados(agora);
  return jobs.has(jobId);
}

export function definirTotal(jobId: string, total: number, agora: number = Date.now()): void {
  const j = jobs.get(jobId);
  if (!j) return;
  j.total = total;
  j.atualizadoEm = agora;
}

export function registrarResultado(jobId: string, ok: boolean, agora: number = Date.now()): void {
  const j = jobs.get(jobId);
  if (!j) return;
  if (ok) j.enviados += 1;
  else j.falhas += 1;
  j.atualizadoEm = agora;
}

export function fecharJob(
  jobId: string, enviados: number, falhas: number, agora: number = Date.now(),
): void {
  const j = jobs.get(jobId);
  if (!j) return;
  j.enviados = enviados;
  j.falhas = falhas;
  j.status = "concluido";
  j.atualizadoEm = agora;
}

export function marcarErro(jobId: string, agora: number = Date.now()): void {
  const j = jobs.get(jobId);
  if (!j) return;
  j.status = "erro";
  j.atualizadoEm = agora;
}

export function obterJob(jobId: string, agora: number = Date.now()): Job | undefined {
  limparExpirados(agora);
  return jobs.get(jobId);
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm test lib/__tests__/jobs.test.ts`
Expected: PASS — 6 testes.

- [ ] **Step 5: Criar a rota de callback do n8n**

`app/api/progress/route.ts`. Ela está fora do middleware de sessão (Task 4) porque quem chama é o n8n — por isso tem token próprio.

```ts
import { NextResponse } from "next/server";
import { progressoSchema } from "@/lib/schema";
import { definirTotal, registrarResultado, fecharJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = req.headers.get("x-callback-token");
  if (!token || token !== process.env.APP_CALLBACK_TOKEN) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const parsed = progressoSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ erro: "payload_invalido" }, { status: 400 });
  }

  const evento = parsed.data;
  // Job inexistente e esperado: disparo agendado nao tem ninguem olhando a tela.
  switch (evento.evento) {
    case "inicio":
      definirTotal(evento.jobId, evento.total);
      break;
    case "progresso":
      registrarResultado(evento.jobId, evento.ok);
      break;
    case "fim":
      fecharJob(evento.jobId, evento.enviados, evento.falhas);
      break;
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Criar a rota de leitura do progresso**

`app/api/jobs/[jobId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { obterJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = obterJob(jobId);
  if (!job) {
    return NextResponse.json({ erro: "job_desconhecido" }, { status: 404 });
  }
  return NextResponse.json(job);
}
```

- [ ] **Step 7: Verificar manualmente**

```bash
pnpm dev
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/progress \
  -H 'Content-Type: application/json' -d '{"evento":"progresso","jobId":"x","ok":true}'
```

Expected: `401` — sem o header do token.

- [ ] **Step 8: Commit**

```bash
git add lib/jobs.ts app/api/progress/route.ts app/api/jobs lib/__tests__/jobs.test.ts
git commit -m "feat: store de progresso em memoria e rotas de acompanhamento"
```

---
## Nota para as Tasks 7–10 (n8n)

Os workflows são construídos pelos tools MCP do n8n, **na ordem que o próprio servidor exige**:

1. `get_sdk_reference` — obrigatório antes de escrever qualquer código do SDK. **Não adivinhe a sintaxe.**
2. `get_workflow_best_practices` para as técnicas envolvidas (`scheduling`, `looping`, `error-handling`).
3. `search_nodes` para cada serviço e utilitário.
4. `get_node_types` com **todos** os IDs de nó, incluindo discriminadores — sem isso os nomes de parâmetro saem errados.
5. `validate_node_config` a cada nó configurado, antes de ligá-lo no grafo.
6. `create_workflow_from_code`, depois `validate_workflow`.

Este plano especifica **o grafo**: nós, parâmetros e ligações. A sintaxe do SDK vem da referência, não daqui.

Servidor MCP a usar: o que lista o workflow `SMS` (`pzixxpeArkDYBco3`) em `search_workflows` — os demais servidores n8n conectados apontam para outra instância e retornam vazio.

---

### Task 7: Data Tables e carga inicial

**Files:** nenhum arquivo local — a mudança acontece no n8n.

**Interfaces:**
- Consumes: nada.
- Produces: as tabelas `sms_grupos`, `sms_agendados` e `sms_disparos`, lidas e escritas pelas Tasks 8–10 e consultadas pelas rotas da Task 11.

- [ ] **Step 1: Criar `sms_grupos`**

Via `create_data_table`, colunas:

| Coluna | Tipo |
|---|---|
| `chave` | string — identificador usado pelo app (ex.: `encontristas`) |
| `label` | string — nome exibido (ex.: `Encontristas`) |
| `aba` | string — nome da aba na planilha |
| `tem_nome` | boolean |
| `ativo` | boolean |

- [ ] **Step 2: Criar `sms_agendados`**

| Coluna | Tipo |
|---|---|
| `grupo` | string |
| `mensagem` | string |
| `fallback_nome` | string |
| `agendado_para_ms` | number |
| `agendado_para` | string (ISO-8601 UTC) |
| `status` | string — `pendente` / `enviando` / `enviado` / `perdido` / `cancelado` |
| `criado_em` | string (ISO-8601 UTC) |
| `resultado` | string (JSON) |

`agendado_para_ms` é **number**. Comparação de data como string funciona por acidente e quebra quando o formato mudar.

- [ ] **Step 3: Criar `sms_disparos`**

| Coluna | Tipo |
|---|---|
| `job_id` | string |
| `grupo` | string |
| `mensagem` | string |
| `origem` | string — `imediato` / `agendado` |
| `iniciado_em` | string (ISO-8601 UTC) |
| `finalizado_em` | string (ISO-8601 UTC) |
| `total` | number |
| `enviados` | number |
| `falhas` | number |
| `resultado` | string (JSON — inclui os telefones que falharam, o que permite acrescentar "reenviar falhas" depois sem migração) |

- [ ] **Step 4: Criar a aba `Teste` na planilha**

No documento `1X1fmj9BGzEc_RsSR0bVPsAWdF9FWi4Iiwyj7-3anKgU`, crie uma aba `Teste` com cabeçalhos `nome` e `telefone`, e **duas linhas com telefones do próprio dono do projeto**. Esta aba é a rede de segurança de todo o resto do plano.

- [ ] **Step 5: Popular `sms_grupos`**

Via `add_data_table_rows`, três linhas — o grupo de teste primeiro, de propósito:

| chave | label | aba | tem_nome | ativo |
|---|---|---|---|---|
| `teste` | Teste | `Teste` | true | true |
| `encontristas` | Encontristas | `Contatos` | true | true |
| `equipistas` | Equipistas | `Vigilia` | false | true |

- [ ] **Step 6: Conferir**

Use `search_data_tables` e confirme as três tabelas, e que `sms_grupos` tem exatamente 3 linhas.

- [ ] **Step 7: Registrar o que foi criado**

Crie `docs/n8n.md` no repositório, anotando os IDs das três Data Tables devolvidos pelo n8n. As Tasks 8–10 precisam desses IDs.

```bash
git add docs/n8n.md
git commit -m "docs: ids das data tables do n8n"
```

---

### Task 8: Sub-workflow `SMS — Enviar` (o motor)

Uma única cópia da lógica de envio, chamada tanto pelo webhook quanto pelo agendador.

**Files:** workflow novo no n8n; anotar o ID em `docs/n8n.md`.

**Interfaces:**
- Consumes: `sms_grupos`, `sms_disparos` (Task 7); a rota `/api/progress` (Task 6).
- Produces: sub-workflow que aceita `{ grupo, mensagem, fallbackNome, jobId, callbackUrl, origem }` e devolve `{ total, enviados, falhas, descartados, resultado }`. Chamado pelas Tasks 9 e 10.

- [ ] **Step 1: Ler a referência do SDK e as boas práticas**

Chame `get_sdk_reference` (seções `guidelines` e `design`) e `get_workflow_best_practices` para `looping` e `error-handling`.

- [ ] **Step 2: Levantar os tipos de nó**

`search_nodes` para: `execute workflow trigger`, `data table`, `google sheets`, `code`, `split in batches`, `http request`, `if`, `wait`, `set`. Depois `get_node_types` com todos os IDs e discriminadores.

- [ ] **Step 3: Montar o grafo**

Entrada do `Execute Workflow Trigger`: `grupo` (string), `mensagem` (string), `fallbackNome` (string), `jobId` (string), `callbackUrl` (string), `origem` (string).

```
Execute Workflow Trigger
→ Resolver Grupo        (Data Table sms_grupos: get row where chave = {{ $json.grupo }})
→ Ler Contatos          (Google Sheets: documento fixo, sheetName = {{ $json.aba }} por expressão)
→ Normalizar Contatos   (Code — codigo no Step 4)
→ Abrir Disparo         (Data Table sms_disparos: insert)
→ Avisar Inicio         (IF callbackUrl != "" → HTTP POST evento "inicio")
→ Loop Contatos         (Split In Batches, batchSize 1)
   ├─ (done)  → Consolidar → Fechar Disparo → Avisar Fim → return
   └─ (loop)  → Montar Mensagem (Code — Step 5)
              → Enviar SMS (HTTP Request — Step 6)
              → Sucesso? (IF 200 <= statusCode < 300)
                 ├─ sim → Registrar Envio (Google Sheets update: ultimo_envio)
                 └─ nao → Marcar Falha (Set: ok = false, codigo, corpo)
              → Avisar Progresso (IF callbackUrl != "" → HTTP POST evento "progresso")
              → Wait 100ms
              → volta ao Loop Contatos
```

- [ ] **Step 4: Código do nó `Normalizar Contatos`**

Porta da regra de `lib/phone.ts` (Task 3). Se aquela regra mudar, esta muda junto.

```js
const MOTIVOS = { vazio: 0, curto: 0, longo: 0, ddd: 0, fixo: 0 };

function normalizar(bruto) {
  const digitos = String(bruto ?? '').replace(/\D/g, '');
  if (digitos.length === 0) return { ok: false, motivo: 'vazio' };

  let nacional = digitos;
  if (nacional.startsWith('55') && nacional.length >= 12) nacional = nacional.slice(2);

  if (nacional.length < 10) return { ok: false, motivo: 'curto' };
  if (nacional.length > 11) return { ok: false, motivo: 'longo' };

  const ddd = nacional.slice(0, 2);
  if (Number(ddd) < 11 || Number(ddd) > 99) return { ok: false, motivo: 'ddd' };

  let assinante = nacional.slice(2);
  if (assinante.length === 8 && /^[6-9]/.test(assinante)) assinante = '9' + assinante;
  if (assinante.length !== 9 || !/^9/.test(assinante)) return { ok: false, motivo: 'fixo' };

  return { ok: true, e164: '55' + ddd + assinante };
}

const entrada = $('Resolver Grupo').first().json;
const vistos = new Set();
const saida = [];

for (const item of $input.all()) {
  const r = normalizar(item.json.telefone);
  if (!r.ok) { MOTIVOS[r.motivo] += 1; continue; }
  if (vistos.has(r.e164)) continue;
  vistos.add(r.e164);
  saida.push({
    json: {
      telefone: r.e164,
      telefoneOriginal: String(item.json.telefone ?? ''),
      nome: String(item.json.nome ?? '').trim(),
      linha: item.json.row_number,
      grupo: entrada.grupo,
      mensagem: entrada.mensagem,
      fallbackNome: entrada.fallbackNome,
      jobId: entrada.jobId,
      callbackUrl: entrada.callbackUrl,
      origem: entrada.origem,
      aba: entrada.aba,
      descartados: MOTIVOS,
    },
  });
}

if (saida.length === 0) {
  return [{ json: { vazio: true, descartados: MOTIVOS, ...entrada } }];
}

return saida;
```

- [ ] **Step 5: Código do nó `Montar Mensagem`**

```js
const item = $input.first().json;
const primeiroNome = (item.nome || '').split(/\s+/)[0] || '';
const substituto = primeiroNome || item.fallbackNome || '';
const texto = String(item.mensagem).replace(/\{\{\s*nome\s*\}\}/g, substituto);

return [{ json: { ...item, textoFinal: texto } }];
```

- [ ] **Step 6: Configuração do nó `Enviar SMS`**

HTTP Request:
- Método: `POST`
- URL: `https://api.zenvia.com/v2/channels/sms/messages`
- Autenticação: credencial genérica **Header Auth** já existente (`X-API-TOKEN`)
- Header adicional: `Content-Type: application/json`
- Corpo (JSON, por expressão):

```
{{ { "from": "joao.pedro.betanza", "to": $json.telefone, "contents": [ { "type": "text", "text": $json.textoFinal } ] } }}
```

- Opções: `fullResponse: true` e `neverError: true`. Sem os dois, um 4xx da Zenvia mata a execução no meio da lista em vez de virar uma falha contabilizada.

- [ ] **Step 7: Código do nó `Consolidar`**

```js
const itens = $input.all();
const enviados = itens.filter((i) => i.json.ok !== false).length;
const falhas = itens.length - enviados;
const erros = itens
  .filter((i) => i.json.ok === false)
  .map((i) => ({ telefone: i.json.telefone, codigo: i.json.codigo, corpo: i.json.corpo }));

const primeiro = itens[0]?.json ?? {};

return [{
  json: {
    total: itens.length,
    enviados,
    falhas,
    descartados: primeiro.descartados ?? {},
    resultado: JSON.stringify({ erros }),
    jobId: primeiro.jobId,
    callbackUrl: primeiro.callbackUrl,
  },
}];
```

- [ ] **Step 8: Configurar os nós de callback**

Três nós HTTP Request, todos com header `X-CALLBACK-TOKEN` (credencial Header Auth nova, `App Callback Token`), `POST` para `{{ $json.callbackUrl }}`, cada um precedido de um IF que confere `callbackUrl` não vazio:

| Nó | Corpo |
|---|---|
| `Avisar Inicio` | `{ "evento": "inicio", "jobId": …, "total": … }` |
| `Avisar Progresso` | `{ "evento": "progresso", "jobId": …, "ok": … }` |
| `Avisar Fim` | `{ "evento": "fim", "jobId": …, "enviados": …, "falhas": … }` |

Marque os três com `onError: continue`: falha de callback **não pode** interromper o envio de SMS.

- [ ] **Step 9: Validar**

Rode `validate_workflow`. Expected: zero erros. Corrija o que aparecer antes de seguir.

- [ ] **Step 10: Testar com o grupo `teste`**

Use `test_workflow` (ou `execute_workflow`) com:

```json
{ "grupo": "teste", "mensagem": "Teste de envio {{nome}}", "fallbackNome": "amigo", "jobId": "manual-1", "callbackUrl": "", "origem": "imediato" }
```

Expected: dois SMS chegam nos celulares do dono; `sms_disparos` ganha uma linha com `total: 2`, `enviados: 2`, `falhas: 0`.

- [ ] **Step 11: Registrar o ID do workflow em `docs/n8n.md` e commitar**

```bash
git add docs/n8n.md
git commit -m "docs: id do sub-workflow SMS - Enviar"
```

---

### Task 9: Workflows `SMS — Webhook` e `SMS — Consultas`

**Files:** dois workflows novos no n8n; IDs em `docs/n8n.md`.

**Interfaces:**
- Consumes: `SMS — Enviar` (Task 8), `sms_grupos`, `sms_agendados`, `sms_disparos` (Task 7).
- Produces: os endpoints `POST /webhook/sms-dispatch` e `POST /webhook/sms-consultas`, consumidos por `lib/n8n.ts` na Task 11.

- [ ] **Step 1: Criar a credencial de entrada**

Credencial **Header Auth** chamada `App SMS Token`: nome do header `X-APP-TOKEN`, valor igual ao `N8N_APP_TOKEN` do `.env` do app.

- [ ] **Step 2: Montar `SMS — Webhook`**

```
Webhook  POST /sms-dispatch   (Header Auth: App SMS Token, responseMode: responseNode)
→ Responder  (Respond to Webhook → { "ok": true, "jobId": "{{ $json.body.jobId }}" })
→ Executar Envio  (Execute Workflow → SMS — Enviar, passando grupo, mensagem,
                   fallbackNome, jobId, callbackUrl, origem = "imediato")
```

A ordem é o ponto inteiro da tarefa: o `Respond to Webhook` vem **antes** do `Execute Workflow`. Ele devolve a resposta HTTP e o workflow **continua rodando** — é o que torna o disparo assíncrono.

- [ ] **Step 3: Montar `SMS — Consultas`**

```
Webhook POST /sms-consultas  (Header Auth: App SMS Token, responseMode: responseNode)
→ Switch por {{ $json.body.action }}
   ├─ "grupos"                  → Ler sms_grupos (ativo = true)
   │                              → Loop → Ler aba correspondente (Sheets)
   │                              → Contar (Code — Step 4) → Responder
   ├─ "historico"               → Ler sms_disparos (ordenado por iniciado_em desc, limite 30) → Responder
   ├─ "agendamentos.listar"     → Ler sms_agendados (status = pendente, asc) → Responder
   ├─ "agendamentos.criar"      → Inserir em sms_agendados (status = pendente) → Responder
   └─ "agendamentos.cancelar"   → Ler linha → IF status = "pendente"
                                   ├─ sim → update status = "cancelado" → Responder { ok: true }
                                   └─ nao → Responder { ok: false, motivo: "ja_iniciado" }
```

O ramo de cancelamento existe porque cancelar algo que já entrou em `enviando` seria mentira: os SMS já estão saindo.

- [ ] **Step 4: Código do nó `Contar` (ação `grupos`)**

O nó `Ler aba correspondente` (Google Sheets) recebe `onError: continue`, para que uma aba
renomeada ou removida não derrube a listagem inteira de grupos.

```js
const grupo = $('Ler sms_grupos').item.json;
const linhas = $input.all();

const falhou = linhas.length > 0 && linhas[0].json.error !== undefined;
if (falhou) {
  return [{
    json: {
      id: grupo.chave,
      label: grupo.label,
      count: 0,
      tem_nome: Boolean(grupo.tem_nome),
      sem_nome: 0,
      erro: `Não consegui ler a aba "${grupo.aba}" da planilha`,
    },
  }];
}

const preenchido = (v) => String(v ?? '').trim().length > 0;
const contatos = linhas.filter((l) => preenchido(l.json.telefone));
const semNome = grupo.tem_nome
  ? contatos.filter((l) => !preenchido(l.json.nome)).length
  : contatos.length;

return [{
  json: {
    id: grupo.chave,
    label: grupo.label,
    count: contatos.length,
    tem_nome: Boolean(grupo.tem_nome),
    sem_nome: semNome,
    erro: null,
  },
}];
```

- [ ] **Step 5: Validar os dois workflows**

Rode `validate_workflow` em cada um. Expected: zero erros.

- [ ] **Step 6: Testar o disparo pelo webhook**

```bash
curl -s -X POST https://webhooks.aotomatika.com.br/webhook/sms-dispatch \
  -H 'Content-Type: application/json' \
  -H 'X-APP-TOKEN: <o token configurado>' \
  -d '{"grupo":"teste","mensagem":"Disparo via webhook","jobId":"curl-1","callbackUrl":"","origem":"imediato"}'
```

Expected: resposta **imediata** `{"ok":true,"jobId":"curl-1"}` (em menos de 2 segundos, não depois dos SMS), e os SMS chegando em seguida.

- [ ] **Step 7: Testar a consulta de grupos**

```bash
curl -s -X POST https://webhooks.aotomatika.com.br/webhook/sms-consultas \
  -H 'Content-Type: application/json' -H 'X-APP-TOKEN: <token>' \
  -d '{"action":"grupos"}'
```

Expected: array com três grupos, cada um com `id`, `label`, `count`, `tem_nome`, `sem_nome`, `erro`.

Teste também o caminho de falha: renomeie temporariamente a aba `Teste` na planilha e repita a
chamada. Expected: o grupo `teste` volta com `erro` preenchido e `count: 0`, e **os outros dois
grupos continuam vindo normalmente**. Renomeie a aba de volta.

- [ ] **Step 8: Testar a rejeição sem token**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://webhooks.aotomatika.com.br/webhook/sms-consultas \
  -H 'Content-Type: application/json' -d '{"action":"grupos"}'
```

Expected: `403` — o buraco de segurança original está fechado.

- [ ] **Step 9: Registrar os IDs e commitar**

```bash
git add docs/n8n.md
git commit -m "docs: ids dos workflows SMS - Webhook e SMS - Consultas"
```

---

### Task 10: Workflow `SMS — Agendador`

**Files:** workflow novo no n8n; ID em `docs/n8n.md`.

**Interfaces:**
- Consumes: `sms_agendados` (Task 7), `SMS — Enviar` (Task 8).
- Produces: execução automática dos agendamentos. Nada no app depende dele em tempo de requisição.

- [ ] **Step 1: Consultar boas práticas de agendamento**

`get_workflow_best_practices` com `technique: "scheduling"`.

- [ ] **Step 2: Montar o grafo**

```
Schedule Trigger (a cada 1 minuto)
→ Buscar Vencidos   (sms_agendados: status = "pendente" E agendado_para_ms <= {{ Date.now() }})
→ Tem Algo?         (IF: contagem > 0; caminho falso encerra)
→ Loop Agendados    (Split In Batches, batchSize 1)
   ├─ (loop) → Classificar Atraso (Code — Step 3)
   │           → Perdido? (IF perdido === true)
   │              ├─ sim → Marcar Perdido (update status = "perdido") → volta ao loop
   │              └─ nao → Marcar Enviando (update status = "enviando")
   │                      → Executar Envio (Execute Workflow → SMS — Enviar,
   │                         origem = "agendado", jobId = "", callbackUrl = "")
   │                      → Marcar Enviado (update status = "enviado" + resultado)
   │                      → volta ao loop
   └─ (done) → fim
```

**`Marcar Enviando` vem antes de `Executar Envio`, não depois.** É um lock otimista: se uma execução do agendador demorar e a seguinte começar por cima, a segunda não enxerga mais aquela linha como pendente. Inverter esses dois nós produz envio duplicado no dia em que a Zenvia estiver lenta.

- [ ] **Step 3: Código do nó `Classificar Atraso`**

```js
const TOLERANCIA_MS = 60 * 60 * 1000; // 1 hora, conforme decidido no spec
const item = $input.first().json;
const atraso = Date.now() - Number(item.agendado_para_ms);

return [{ json: { ...item, atrasoMs: atraso, perdido: atraso > TOLERANCIA_MS } }];
```

- [ ] **Step 4: Validar**

Rode `validate_workflow`. Expected: zero erros.

- [ ] **Step 5: Testar o caminho feliz**

Insira uma linha em `sms_agendados` com `grupo: "teste"`, mensagem qualquer, `status: "pendente"` e `agendado_para_ms` = agora + 2 minutos.

Expected: em até 3 minutos os SMS chegam, a linha vira `status: "enviado"` com `resultado` preenchido, e uma linha nova aparece em `sms_disparos` com `origem: "agendado"`.

- [ ] **Step 6: Testar a tolerância de atraso**

Insira uma linha `pendente` com `agendado_para_ms` = agora − 2 horas.

Expected: no minuto seguinte a linha vira `status: "perdido"` e **nenhum SMS é enviado**.

- [ ] **Step 7: Ativar e registrar**

Publique o workflow (`publish_workflow`), anote o ID em `docs/n8n.md`.

```bash
git add docs/n8n.md
git commit -m "docs: id do workflow SMS - Agendador"
```

---
### Task 11: Rotas de grupos, envio, histórico e agendamentos

**Files:**
- Create: `app/api/groups/route.ts`, `app/api/send/route.ts`, `app/api/history/route.ts`, `app/api/schedules/route.ts`, `app/api/schedules/[id]/route.ts`
- Modify: `lib/schema.ts` (acrescentar `jobId` opcional a `baseEnvio`)

**Interfaces:**
- Consumes: `chamarN8n`, `N8nIndisponivel` (Task 5); `abrirJob`, `jobExiste`, `marcarErro` (Task 6); os webhooks das Tasks 9 e 10.
- Produces: `GET /api/groups`, `POST /api/send`, `GET /api/history`, `GET|POST /api/schedules`, `DELETE /api/schedules/:id`. Consumidos pelas telas (Tasks 13–15).

- [ ] **Step 1: Acrescentar `jobId` ao contrato de envio**

Em `lib/schema.ts`, dentro de `baseEnvio`, some o campo:

```ts
  jobId: z.string().min(8).optional(),
```

O `jobId` vem do cliente porque é ele quem permite reconhecer clique duplo e recuperar um disparo cuja resposta se perdeu.

- [ ] **Step 2: Criar `/api/groups` com cache e degradação**

`app/api/groups/route.ts`. O cache obsoleto é servido quando o n8n cai: melhor mostrar contagem de um minuto atrás do que uma tela vazia.

```ts
import { NextResponse } from "next/server";
import { chamarN8n, N8nIndisponivel } from "@/lib/n8n";
import { gruposSchema, type Grupo } from "@/lib/schema";

export const runtime = "nodejs";

const CACHE_MS = 60_000;
let cache: { em: number; dados: Grupo[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.em < CACHE_MS) {
    return NextResponse.json(cache.dados);
  }

  try {
    const bruto = await chamarN8n<unknown>("sms-consultas", { action: "grupos" });
    const dados = gruposSchema.parse(bruto);
    cache = { em: Date.now(), dados };
    return NextResponse.json(dados);
  } catch (e) {
    if (cache) {
      return NextResponse.json(cache.dados, { headers: { "X-Cache-Obsoleto": "1" } });
    }
    const status = e instanceof N8nIndisponivel ? 503 : 502;
    return NextResponse.json(
      { erro: "grupos_indisponiveis", mensagem: "Não consegui carregar os grupos." },
      { status },
    );
  }
}
```

- [ ] **Step 3: Criar `/api/send`**

`app/api/send/route.ts`:

```ts
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { enviarSchema } from "@/lib/schema";
import { chamarN8n, N8nIndisponivel } from "@/lib/n8n";
import { abrirJob, jobExiste, marcarErro } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const parsed = enviarSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "invalido", detalhes: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { grupo, mensagem, fallbackNome } = parsed.data;
  const jobId = parsed.data.jobId ?? randomUUID();

  // Clique duplo: o segundo POST encontra o job aberto e nao dispara de novo.
  if (jobExiste(jobId)) {
    return NextResponse.json({ ok: true, jobId, duplicado: true });
  }

  abrirJob(jobId, grupo);

  try {
    await chamarN8n("sms-dispatch", {
      grupo,
      mensagem,
      fallbackNome: fallbackNome ?? "",
      jobId,
      callbackUrl: `${process.env.APP_PUBLIC_URL}/api/progress`,
      origem: "imediato",
    });
    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    marcarErro(jobId);
    if (e instanceof N8nIndisponivel) {
      // Ambiguidade real: pode ter chegado no n8n. Nao afirmamos que falhou.
      return NextResponse.json(
        {
          erro: "nao_confirmado",
          jobId,
          mensagem:
            "Não consegui confirmar o disparo. Verifique no histórico antes de tentar de novo.",
        },
        { status: 504 },
      );
    }
    return NextResponse.json({ erro: "falha_n8n", jobId }, { status: 502 });
  }
}
```

- [ ] **Step 4: Criar `/api/history`**

`app/api/history/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { chamarN8n } from "@/lib/n8n";
import { disparoSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bruto = await chamarN8n<unknown>("sms-consultas", { action: "historico" });
    return NextResponse.json(z.array(disparoSchema).parse(bruto));
  } catch {
    return NextResponse.json(
      { erro: "historico_indisponivel", mensagem: "Não consegui carregar o histórico." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 5: Criar `/api/schedules`**

`app/api/schedules/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { chamarN8n } from "@/lib/n8n";
import { agendarSchema, agendamentoSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bruto = await chamarN8n<unknown>("sms-consultas", { action: "agendamentos.listar" });
    return NextResponse.json(z.array(agendamentoSchema).parse(bruto));
  } catch {
    return NextResponse.json(
      { erro: "agendamentos_indisponiveis", mensagem: "Não consegui carregar os agendamentos." },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const parsed = agendarSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "invalido", detalhes: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { grupo, mensagem, fallbackNome, agendadoParaMs } = parsed.data;

  try {
    const criado = await chamarN8n<unknown>("sms-consultas", {
      action: "agendamentos.criar",
      grupo,
      mensagem,
      fallback_nome: fallbackNome ?? "",
      agendado_para_ms: agendadoParaMs,
      agendado_para: new Date(agendadoParaMs).toISOString(),
    });
    return NextResponse.json(criado, { status: 201 });
  } catch {
    return NextResponse.json(
      { erro: "falha_ao_agendar", mensagem: "Não consegui salvar o agendamento." },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 6: Criar `/api/schedules/[id]`**

`app/api/schedules/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { chamarN8n } from "@/lib/n8n";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const r = await chamarN8n<{ ok: boolean; motivo?: string }>("sms-consultas", {
      action: "agendamentos.cancelar",
      id,
    });

    if (!r.ok && r.motivo === "ja_iniciado") {
      return NextResponse.json(
        { erro: "ja_iniciado", mensagem: "Esse envio já começou e não pode ser cancelado." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { erro: "falha_ao_cancelar", mensagem: "Não consegui cancelar o agendamento." },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 7: Verificar de ponta a ponta**

Com o app rodando e a sessão criada pelo `/api/login`, guarde o cookie e chame:

```bash
curl -s -b cookies.txt http://localhost:3000/api/groups
```

Expected: os três grupos, com `count` e `sem_nome` preenchidos vindos da planilha real.

- [ ] **Step 8: Commit**

```bash
git add app/api lib/schema.ts
git commit -m "feat: rotas de grupos, envio, historico e agendamentos"
```

---

### Task 12: Tela de login

**Files:**
- Create: `app/login/page.tsx`
- Modify: `app/page.tsx` (redirecionar para `/compor`)

**Interfaces:**
- Consumes: `POST /api/login` (Task 4).
- Produces: sessão criada no navegador; todas as telas seguintes dependem dela.

- [ ] **Step 1: Criar a tela**

`app/login/page.tsx` — componentes HeroUI **v2**: imports por pacote, `CardBody` (não `Card.Body`), e `onPress` no botão:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        setErro(corpo.mensagem ?? "Não consegui entrar.");
        return;
      }
      router.push("/compor");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex gap-2">
          <KeyRound className="size-5 text-primary" />
          <h1 className="font-serif text-xl">Envio de SMS</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Input
            label="Senha"
            type="password"
            value={senha}
            onValueChange={setSenha}
            isInvalid={Boolean(erro)}
            errorMessage={erro}
            onKeyDown={(e) => {
              if (e.key === "Enter") entrar();
            }}
          />
          <Button color="primary" isLoading={carregando} onPress={entrar}>
            Entrar
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Redirecionar a raiz**

`app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/compor");
}
```

- [ ] **Step 3: Verificar**

Run: `pnpm dev` e abra `http://localhost:3000`
Expected: redireciona para `/login` (middleware da Task 4). Senha errada mostra a mensagem embaixo do campo; senha certa leva a `/compor` (que ainda dá 404 — a tela vem na Task 13).

- [ ] **Step 4: Commit**

```bash
git add app/login app/page.tsx
git commit -m "feat: tela de login"
```

---

### Task 13: Tela de composição

**Files:**
- Create: `app/compor/page.tsx`, `components/SeletorGrupo.tsx`, `components/EditorMensagem.tsx`, `components/ContadorSegmentos.tsx`
- Test: `components/__tests__/ContadorSegmentos.test.tsx`

**Interfaces:**
- Consumes: `contarSms` (Task 2), `Grupo` (Task 5), `GET /api/groups` (Task 11).
- Produces: `<SeletorGrupo grupos valor aoMudar />`, `<EditorMensagem valor aoMudar podeUsarNome aoInserirNome />`, `<ContadorSegmentos texto contatos />`. A Task 14 monta a confirmação em cima desta tela.

- [ ] **Step 1: Escrever o teste do contador**

`components/__tests__/ContadorSegmentos.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContadorSegmentos } from "@/components/ContadorSegmentos";

describe("ContadorSegmentos", () => {
  it("mostra o total cobrado em SMS, não em mensagens", () => {
    render(<ContadorSegmentos texto={"á".repeat(71)} contatos={10} />);
    expect(screen.getByText(/20 SMS/)).toBeDefined();
  });

  it("avisa quando o texto sai do GSM-7", () => {
    render(<ContadorSegmentos texto="Olá" contatos={5} />);
    expect(screen.getByText(/acento/i)).toBeDefined();
  });

  it("não avisa em texto puramente GSM-7", () => {
    render(<ContadorSegmentos texto="Reuniao as 19h" contatos={5} />);
    expect(screen.queryByText(/acento/i)).toBeNull();
  });
});
```

Crie também `vitest.setup.ts` com `import "@testing-library/jest-dom/vitest";` e aponte `test.setupFiles: ["./vitest.setup.ts"]` no `vitest.config.ts`.

- [ ] **Step 2: Rodar para ver falhar**

Run: `pnpm test components/__tests__/ContadorSegmentos.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ContadorSegmentos"`.

- [ ] **Step 3: Implementar o contador**

`components/ContadorSegmentos.tsx`:

```tsx
"use client";

import { contarSms } from "@/lib/sms";
import { AlertTriangle } from "lucide-react";

export function ContadorSegmentos({ texto, contatos }: { texto: string; contatos: number }) {
  const c = contarSms(texto);
  const totalSms = c.segmentos * contatos;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>
        {c.caracteres}/{c.limitePorSegmento} · {c.segmentos}{" "}
        {c.segmentos === 1 ? "segmento" : "segmentos"}
      </span>
      {contatos > 0 && (
        <span className="font-medium text-foreground">= {totalSms} SMS</span>
      )}
      {c.alfabeto === "UCS-2" && (
        <span className="flex items-center gap-1 text-warning-600">
          <AlertTriangle className="size-4" />
          acento ou emoji reduz o limite para 70 caracteres
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar até passar**

Run: `pnpm test components/__tests__/ContadorSegmentos.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Implementar o seletor de grupo**

`components/SeletorGrupo.tsx`:

```tsx
"use client";

import { Select, SelectItem } from "@heroui/select";
import type { Grupo } from "@/lib/schema";

export function SeletorGrupo({
  grupos, valor, aoMudar,
}: {
  grupos: Grupo[];
  valor: string;
  aoMudar: (chave: string) => void;
}) {
  return (
    <Select
      label="Grupo"
      disabledKeys={grupos.filter((g) => g.erro).map((g) => g.id)}
      selectedKeys={valor ? [valor] : []}
      onSelectionChange={(chaves) => aoMudar(String(Array.from(chaves)[0] ?? ""))}
    >
      {grupos.map((g) => (
        <SelectItem
          key={g.id}
          textValue={g.erro ? `${g.label} (indisponível)` : `${g.label} (${g.count} contatos)`}
        >
          {g.erro ? (
            <span className="text-danger">
              {g.label} · {g.erro}
            </span>
          ) : (
            <>
              {g.label} · {g.count} contatos
            </>
          )}
        </SelectItem>
      ))}
    </Select>
  );
}
```

- [ ] **Step 6: Implementar o editor de mensagem**

`components/EditorMensagem.tsx`:

```tsx
"use client";

import { Textarea } from "@heroui/input";
import { Button } from "@heroui/button";

export function EditorMensagem({
  valor, aoMudar, podeUsarNome,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  podeUsarNome: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        label="Mensagem"
        minRows={4}
        value={valor}
        onValueChange={aoMudar}
        placeholder="Escreva o comunicado"
      />
      {podeUsarNome && (
        <Button
          size="sm"
          variant="flat"
          className="self-start"
          onPress={() => aoMudar(`${valor}{{nome}}`)}
        >
          + {"{{nome}}"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Montar a tela**

`app/compor/page.tsx`. O campo de fallback aparece sempre que a mensagem contém `{{nome}}` — e é obrigatório, porque o grupo pode ganhar um contato sem nome entre compor e disparar.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { RadioGroup, Radio } from "@heroui/radio";
import { DatePicker } from "@heroui/date-picker";
import { Spinner } from "@heroui/spinner";
import { now, getLocalTimeZone, type ZonedDateTime } from "@internationalized/date";
import type { Grupo } from "@/lib/schema";
import { SeletorGrupo } from "@/components/SeletorGrupo";
import { EditorMensagem } from "@/components/EditorMensagem";
import { ContadorSegmentos } from "@/components/ContadorSegmentos";

export default function ComporPage() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erroGrupos, setErroGrupos] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [fallbackNome, setFallbackNome] = useState("");
  const [quando, setQuando] = useState<"agora" | "agendar">("agora");
  const [dataHora, setDataHora] = useState<ZonedDateTime | null>(
    now(getLocalTimeZone()).add({ minutes: 30 }),
  );

  useEffect(() => {
    fetch("/api/groups")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).mensagem ?? "falha");
        return r.json();
      })
      .then(setGrupos)
      .catch((e: Error) => setErroGrupos(e.message));
  }, []);

  const grupo = useMemo(
    () => grupos?.find((g) => g.id === grupoId) ?? null,
    [grupos, grupoId],
  );
  const usaNome = mensagem.includes("{{nome}}");

  if (erroGrupos) {
    return <p className="p-8 text-danger">{erroGrupos}</p>;
  }
  if (!grupos) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <h1 className="font-serif text-xl">Enviar SMS</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <SeletorGrupo grupos={grupos} valor={grupoId} aoMudar={setGrupoId} />

          <EditorMensagem
            valor={mensagem}
            aoMudar={setMensagem}
            podeUsarNome={Boolean(grupo?.tem_nome)}
          />

          {usaNome && (
            <Input
              isRequired
              label="Sem nome, usar:"
              value={fallbackNome}
              onValueChange={setFallbackNome}
              description={
                grupo
                  ? grupo.sem_nome > 0
                    ? `${grupo.sem_nome} de ${grupo.count} contatos estão sem nome preenchido`
                    : "Todos os contatos têm nome — usado só se algum ficar em branco"
                  : undefined
              }
            />
          )}

          <ContadorSegmentos texto={mensagem} contatos={grupo?.count ?? 0} />

          <RadioGroup
            orientation="horizontal"
            value={quando}
            onValueChange={(v) => setQuando(v as "agora" | "agendar")}
          >
            <Radio value="agora">Enviar agora</Radio>
            <Radio value="agendar">Agendar</Radio>
          </RadioGroup>

          {quando === "agendar" && (
            <DatePicker
              label="Data e hora"
              granularity="minute"
              value={dataHora}
              onChange={setDataHora}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
```

O botão de envio e o diálogo de confirmação entram na Task 14 — esta tarefa entrega a composição.

- [ ] **Step 8: Verificar**

Run: `pnpm dev`, faça login e abra `/compor`
Expected: os três grupos aparecem com contagem real; digitar acento muda o contador para 70; escrever `{{nome}}` faz o campo de fallback aparecer; escolher "Agendar" revela o seletor de data e hora.

Repita o teste da aba renomeada (Task 9, Step 7). Expected: o grupo afetado aparece em vermelho
com a mensagem de erro e **não é selecionável**, enquanto os demais continuam funcionando.

- [ ] **Step 9: Commit**

```bash
git add app/compor components lib
git commit -m "feat: tela de composicao com contador de segmentos e fallback de nome"
```

---
### Task 14: Confirmação, disparo e progresso ao vivo

**Files:**
- Create: `hooks/useJobProgress.ts`, `components/DialogoConfirmacao.tsx`, `components/PainelProgresso.tsx`
- Modify: `app/compor/page.tsx`

**Interfaces:**
- Consumes: `contarSms` (Task 2), `Job` (Task 6), `POST /api/send` e `POST /api/schedules` (Task 11), `GET /api/jobs/:jobId` (Task 6).
- Produces: `useJobProgress(jobId)` retornando `{ job, perdido }`; `<DialogoConfirmacao />` e `<PainelProgresso />`.

- [ ] **Step 1: Criar o hook de progresso**

`hooks/useJobProgress.ts`. Ele para sozinho quando o job termina, e desiste depois de 30 minutos para não pollar para sempre.

```ts
"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/jobs";

const INTERVALO_MS = 1500;
const LIMITE_MS = 30 * 60 * 1000;

export function useJobProgress(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [perdido, setPerdido] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();

    async function tick() {
      if (!vivo) return;

      try {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (r.status === 404) {
          setPerdido(true);
          return;
        }
        const j: Job = await r.json();
        if (!vivo) return;
        setJob(j);
        if (j.status !== "enviando") return; // terminou: para de pollar
      } catch {
        // rede instavel: ignora e tenta de novo no proximo tick
      }

      if (Date.now() - inicio > LIMITE_MS) {
        setPerdido(true);
        return;
      }
      timer = setTimeout(tick, INTERVALO_MS);
    }

    timer = setTimeout(tick, 0);

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return { job, perdido };
}
```

- [ ] **Step 2: Criar o diálogo de confirmação**

`components/DialogoConfirmacao.tsx`. Ele fecha a conta em **SMS cobrados**, não em mensagens — é o número que muda a decisão antes do clique.

```tsx
"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { contarSms } from "@/lib/sms";

export function DialogoConfirmacao({
  aberto, aoFechar, aoConfirmar, grupoLabel, contatos, mensagem, quando, enviando,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  grupoLabel: string;
  contatos: number;
  mensagem: string;
  quando: string;
  enviando: boolean;
}) {
  const c = contarSms(mensagem);
  const totalSms = c.segmentos * contatos;

  return (
    <Modal isOpen={aberto} onClose={aoFechar}>
      <ModalContent>
        <ModalHeader className="font-serif">Confirmar envio</ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <p className="font-medium">
            {grupoLabel} · {contatos} contatos
          </p>
          <p className="rounded-medium bg-muted p-3 text-sm italic">{mensagem}</p>
          <p className="text-sm text-muted-foreground">
            {c.segmentos} {c.segmentos === 1 ? "segmento" : "segmentos"} × {contatos} contatos ={" "}
            <strong className="text-foreground">{totalSms} SMS</strong>
          </p>
          <p className="text-sm text-muted-foreground">{quando}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={aoFechar}>
            Cancelar
          </Button>
          <Button color="primary" isLoading={enviando} onPress={aoConfirmar}>
            Confirmar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

- [ ] **Step 3: Criar o painel de progresso**

`components/PainelProgresso.tsx`:

```tsx
"use client";

import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import type { Job } from "@/lib/jobs";

export function PainelProgresso({ job, perdido }: { job: Job | null; perdido: boolean }) {
  if (perdido) {
    return (
      <Card>
        <CardBody className="text-sm text-muted-foreground">
          Perdi o acompanhamento deste envio. Ele pode ter continuado — confira no histórico.
        </CardBody>
      </Card>
    );
  }
  if (!job) return null;

  const processados = job.enviados + job.falhas;
  const valor = job.total > 0 ? (processados / job.total) * 100 : 0;

  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <Progress
          aria-label="Progresso do envio"
          value={valor}
          isIndeterminate={job.total === 0 && job.status === "enviando"}
          color={job.status === "erro" ? "danger" : "primary"}
        />
        <p className="text-sm">
          {job.status === "enviando"
            ? `${processados} de ${job.total || "…"} enviados`
            : `Concluído: ${job.enviados} enviados, ${job.falhas} falharam`}
        </p>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: Ligar tudo na tela de composição**

Em `app/compor/page.tsx`, acrescente aos imports:

```tsx
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { DialogoConfirmacao } from "@/components/DialogoConfirmacao";
import { PainelProgresso } from "@/components/PainelProgresso";
import { useJobProgress } from "@/hooks/useJobProgress";
```

Acrescente ao estado do componente:

```tsx
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const { job, perdido } = useJobProgress(jobId);
```

E as duas funções, antes do `return`:

```tsx
  const podeEnviar =
    Boolean(grupoId) && mensagem.trim().length > 0 && (!usaNome || fallbackNome.trim().length > 0);

  async function confirmar() {
    setEnviando(true);
    const novoJobId = crypto.randomUUID();

    try {
      if (quando === "agora") {
        const r = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grupo: grupoId,
            mensagem,
            fallbackNome: usaNome ? fallbackNome : undefined,
            jobId: novoJobId,
          }),
        });
        const corpo = await r.json().catch(() => ({}));

        if (r.status === 504) {
          // Ambiguidade real: nao afirmamos que falhou.
          setConfirmando(false);
          addToast({ title: "Não consegui confirmar", description: corpo.mensagem, color: "warning" });
          return;
        }
        if (!r.ok) {
          addToast({ title: "Falha no envio", description: corpo.mensagem ?? "Tente de novo.", color: "danger" });
          return;
        }

        setJobId(corpo.jobId ?? novoJobId);
        setConfirmando(false);
      } else {
        const r = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grupo: grupoId,
            mensagem,
            fallbackNome: usaNome ? fallbackNome : undefined,
            agendadoParaMs: dataHora?.toDate().getTime(),
          }),
        });
        if (!r.ok) {
          const corpo = await r.json().catch(() => ({}));
          addToast({ title: "Não consegui agendar", description: corpo.mensagem, color: "danger" });
          return;
        }
        setConfirmando(false);
        setMensagem("");
        addToast({ title: "Agendado", color: "success" });
      }
    } finally {
      setEnviando(false);
    }
  }
```

E o rodapé do `CardBody`, depois do `DatePicker`:

```tsx
          <Button
            color="primary"
            isDisabled={!podeEnviar}
            onPress={() => setConfirmando(true)}
          >
            {quando === "agora" ? "Enviar" : "Agendar"}
          </Button>
```

E, depois do `</Card>`:

```tsx
      <PainelProgresso job={job} perdido={perdido} />

      <DialogoConfirmacao
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={confirmar}
        grupoLabel={grupo?.label ?? ""}
        contatos={grupo?.count ?? 0}
        mensagem={mensagem}
        quando={
          quando === "agora"
            ? "Envio imediato"
            : `Agendado para ${dataHora?.toDate().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
        }
        enviando={enviando}
      />
```

- [ ] **Step 5: Testar com o grupo `teste`**

Run: `pnpm dev`, escolha o grupo **Teste**, escreva uma mensagem e envie.
Expected: o diálogo mostra `Teste · 2 contatos` e a conta em SMS; ao confirmar, a barra sobe de 0 a 2 e o texto vira `Concluído: 2 enviados, 0 falharam`. Os dois SMS chegam.

- [ ] **Step 6: Commit**

```bash
git add hooks components app/compor
git commit -m "feat: confirmacao de envio e progresso ao vivo"
```

---

### Task 15: Telas de agendados e histórico

**Files:**
- Create: `app/agendados/page.tsx`, `app/historico/page.tsx`, `components/Navegacao.tsx`
- Modify: `app/layout.tsx` (incluir a navegação)

**Interfaces:**
- Consumes: `GET /api/schedules`, `DELETE /api/schedules/:id`, `GET /api/history` (Task 11); `Agendamento` e `Disparo` (Task 5).
- Produces: as duas telas e a navegação entre elas.

- [ ] **Step 1: Criar a navegação**

`components/Navegacao.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const ITENS = [
  { href: "/compor", label: "Enviar" },
  { href: "/agendados", label: "Agendados" },
  { href: "/historico", label: "Histórico" },
];

export function Navegacao() {
  const atual = usePathname();
  if (atual === "/login") return null;

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-2xl gap-4 p-4">
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={clsx(
              "text-sm",
              atual === i.href ? "font-medium text-primary" : "text-muted-foreground",
            )}
          >
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

Em `app/layout.tsx`, dentro da `<div className="relative flex flex-col min-h-screen">`, antes do `<main>`:

```tsx
            <Navegacao />
```

- [ ] **Step 2: Criar a tela de agendados**

`app/agendados/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import type { Agendamento } from "@/lib/schema";

const CORES: Record<Agendamento["status"], "default" | "primary" | "success" | "warning" | "danger"> = {
  pendente: "primary",
  enviando: "warning",
  enviado: "success",
  perdido: "danger",
  cancelado: "default",
};

export default function AgendadosPage() {
  const [itens, setItens] = useState<Agendamento[] | null>(null);

  async function carregar() {
    const r = await fetch("/api/schedules", { cache: "no-store" });
    setItens(r.ok ? await r.json() : []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function cancelar(id: string) {
    const r = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      addToast({ title: "Não deu para cancelar", description: corpo.mensagem, color: "danger" });
    }
    carregar();
  }

  if (!itens) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (itens.length === 0) {
    return <p className="mx-auto max-w-2xl p-4 text-muted-foreground">Nenhum envio agendado.</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      {itens.map((a) => (
        <Card key={a.id}>
          <CardBody className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.grupo}</span>
                <Chip size="sm" color={CORES[a.status]} variant="flat">
                  {a.status}
                </Chip>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{a.mensagem}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(a.agendado_para_ms).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
            </div>
            {a.status === "pendente" && (
              <Button size="sm" color="danger" variant="light" onPress={() => cancelar(a.id)}>
                Cancelar
              </Button>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Criar a tela de histórico**

`app/historico/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Spinner } from "@heroui/spinner";
import type { Disparo } from "@/lib/schema";

export default function HistoricoPage() {
  const [itens, setItens] = useState<Disparo[] | null>(null);

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : []))
      .then(setItens);
  }, []);

  if (!itens) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Table aria-label="Histórico de disparos">
        <TableHeader>
          <TableColumn>QUANDO</TableColumn>
          <TableColumn>GRUPO</TableColumn>
          <TableColumn>MENSAGEM</TableColumn>
          <TableColumn>RESULTADO</TableColumn>
        </TableHeader>
        <TableBody emptyContent="Nenhum disparo ainda.">
          {itens.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                {new Date(d.iniciado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </TableCell>
              <TableCell>{d.grupo}</TableCell>
              <TableCell className="max-w-xs truncate">{d.mensagem}</TableCell>
              <TableCell>
                {d.enviados} enviados
                {d.falhas > 0 && <span className="text-danger"> · {d.falhas} falhas</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `pnpm dev`
Expected: `/historico` lista o disparo de teste da Task 14; `/agendados` mostra o agendamento criado na Task 10 (ou vazio) e o botão Cancelar só aparece em `pendente`.

- [ ] **Step 5: Commit**

```bash
git add app/agendados app/historico components/Navegacao.tsx app/layout.tsx
git commit -m "feat: telas de agendados e historico"
```

---

### Task 16: Teste de ponta a ponta e empacotamento

**Files:**
- Create: `playwright.config.ts`, `e2e/envio.spec.ts`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docs/deploy.md`
- Modify: `next.config.ts` (saída standalone)

**Interfaces:**
- Consumes: todas as tarefas anteriores.
- Produces: imagem Docker executável e um teste E2E do caminho crítico.

- [ ] **Step 1: Instalar o Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Configurar**

`playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    env: {
      APP_PASSWORD: "senha-de-teste",
      SESSION_SECRET: "segredo-de-teste",
      N8N_BASE_URL: "https://n8n.invalido",
      N8N_APP_TOKEN: "token-de-teste",
      APP_CALLBACK_TOKEN: "callback-de-teste",
      APP_PUBLIC_URL: "http://localhost:3000",
    },
  },
});
```

- [ ] **Step 3: Escrever o teste do caminho crítico**

`e2e/envio.spec.ts`. O n8n é interceptado no navegador, então o teste não depende da rede nem manda SMS de verdade.

```ts
import { test, expect } from "@playwright/test";

test("login, composição, confirmação e progresso", async ({ page }) => {
  await page.route("**/api/groups", (route) =>
    route.fulfill({
      json: [{ id: "teste", label: "Teste", count: 2, tem_nome: true, sem_nome: 1 }],
    }),
  );
  await page.route("**/api/send", (route) => route.fulfill({ json: { ok: true, jobId: "e2e-1" } }));
  await page.route("**/api/jobs/e2e-1", (route) =>
    route.fulfill({
      json: {
        jobId: "e2e-1", grupo: "teste", total: 2, enviados: 2, falhas: 0,
        status: "concluido", criadoEm: Date.now(), atualizadoEm: Date.now(),
      },
    }),
  );

  await page.goto("/login");
  await page.getByLabel("Senha").fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/compor/);

  await page.getByLabel("Grupo").click();
  await page.getByRole("option", { name: /Teste/ }).click();
  await page.getByLabel("Mensagem").fill("Aviso de teste");

  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Teste · 2 contatos")).toBeVisible();
  await expect(page.getByText(/2 SMS/)).toBeVisible();

  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Concluído: 2 enviados, 0 falharam")).toBeVisible();
});
```

- [ ] **Step 4: Rodar o E2E**

Run: `pnpm exec playwright test`
Expected: 1 teste passa.

Adicione ao `package.json`: `"test:e2e": "playwright test"`.

- [ ] **Step 5: Configurar saída standalone**

Em `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 6: Criar o Dockerfile**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`.dockerignore`:

```
node_modules
.next
.git
e2e
docs
.env*
```

- [ ] **Step 7: Criar o compose**

`docker-compose.yml`. **Uma réplica** — o store de progresso em memória depende disso (ver Restrição Conhecida no spec).

```yaml
services:
  sms-sender:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      APP_PASSWORD: ${APP_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      N8N_BASE_URL: ${N8N_BASE_URL}
      N8N_APP_TOKEN: ${N8N_APP_TOKEN}
      APP_CALLBACK_TOKEN: ${APP_CALLBACK_TOKEN}
      APP_PUBLIC_URL: ${APP_PUBLIC_URL}
```

- [ ] **Step 8: Verificar a imagem**

```bash
docker compose build && docker compose up -d && sleep 5 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```

Expected: `200`.

- [ ] **Step 9: Escrever `docs/deploy.md`**

Documente: as seis variáveis de ambiente, a exigência de **instância única**, o fato de `APP_PUBLIC_URL` precisar ser alcançável **a partir do n8n** (é para onde vão os callbacks), e o lembrete de que os tokens no n8n e no app precisam bater.

- [ ] **Step 10: Rodar a suíte inteira**

Run: `pnpm test && pnpm exec playwright test && pnpm build`
Expected: unitários passam, E2E passa, build conclui.

- [ ] **Step 11: Commit**

```bash
git add playwright.config.ts e2e Dockerfile docker-compose.yml .dockerignore docs/deploy.md next.config.ts package.json
git commit -m "chore: teste e2e do caminho critico e empacotamento docker"
```

---

## Verificação final

Antes de considerar o projeto pronto:

- [ ] `pnpm test` — todos os unitários passam
- [ ] `pnpm exec playwright test` — E2E passa
- [ ] `pnpm build` — build limpo
- [ ] Disparo real para o grupo **Teste**, com os dois celulares na mão
- [ ] Agendamento real para dali a 2 minutos, confirmado chegando
- [ ] `curl` sem `X-APP-TOKEN` nos dois webhooks devolve `403`
- [ ] Os webhooks antigos (`send-messagge-encontristas`, `send-messagge-equipistas`) foram desativados ou removidos — enquanto existirem, o buraco de segurança original continua aberto
