# SMS Sender — Design

**Data:** 2026-08-21
**Status:** aprovado
**Autor:** João Pedro (com Claude)

## Problema

Hoje o envio de SMS em massa acontece por dois webhooks públicos e sem credencial no n8n
(`send-messagge-encontristas` e `send-messagge-equipistas`), disparados na mão. Três problemas:

1. **Sem interface.** Enviar exige montar um POST manualmente.
2. **Sem proteção.** Quem descobrir a URL dispara SMS para a lista inteira, no crédito Zenvia
   e com o remetente do dono da conta.
3. **Duplicação.** As duas esteiras do workflow são cópias uma da outra; cada grupo novo
   multiplicaria a lógica de envio.

## Objetivo

Uma tela onde se escreve a mensagem, escolhe-se o grupo e dispara-se — na hora ou agendado —
com acompanhamento do progresso e histórico.

## Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Resolução de grupo | Webhook único + mapa em Data Table | Elimina a esteira duplicada; grupo novo = 1 linha |
| Acesso | Senha única + rota server-side | O navegador nunca vê a URL nem o token do n8n |
| Volume | 50–300 contatos por grupo | Define o envio como assíncrono com acompanhamento |
| Reenvio | Todos, sempre | Cada disparo é um comunicado novo, não uma campanha a completar |
| Agendamento | Apenas pontual | Cobre o caso real (aviso de evento) sem peso de recorrência |
| Atraso do agendador | Envia se < 1h; senão marca perdido | Aviso muito atrasado é pior que aviso nenhum |
| Hospedagem | VPS própria, Docker, instância única | Permite progresso ao vivo com estado em memória |

## Arquitetura

O navegador nunca fala com o n8n. Toda chamada passa por Route Handler do Next, que injeta o
header secreto. As credenciais do Google e da Zenvia permanecem inteiramente dentro do n8n.

| Peça | Responsabilidade |
|---|---|
| App Next.js (`sms-sender`) | Tela, sessão, validação, progresso ao vivo |
| n8n · `SMS — Enviar` | Sub-workflow. O motor: grupo → aba → loop → Zenvia → callback |
| n8n · `SMS — Webhook` | Porta de entrada do disparo imediato |
| n8n · `SMS — Agendador` | Schedule Trigger de 1 min; colhe vencidos e chama o motor |
| n8n · `SMS — Consultas` | Webhook único: grupos, histórico, CRUD de agendamentos |
| Data Tables do n8n | Persistência, sem banco externo |

Envio imediato e envio agendado percorrem **o mesmo motor**. A única diferença é quem puxa o
gatilho: um webhook ou um relógio.

### Fluxo de um disparo imediato

1. Login com senha única → cookie `httpOnly` assinado (12h).
2. `GET /api/groups` → webhook `sms-consultas` → lista com contagem; cache de 60s no servidor.
3. Usuário escreve a mensagem, escolhe o grupo, confirma no diálogo.
4. `POST /api/send { group, message }` → app valida → chama `sms-dispatch` com
   `{ grupo, mensagem, jobId, callbackUrl }`.
5. O n8n responde na hora com `{ ok, jobId }` (nó *Respond to Webhook* no início) e **continua
   executando**. O app registra o job em memória.
6. A cada contato, o n8n dá POST em `/api/progress` → contador sobe.
7. O navegador consulta `GET /api/jobs/:jobId` a cada 1,5s → barra real.
8. No fim, o n8n envia o callback de encerramento com o resumo.

## Data Tables

```
sms_grupos     id · label · aba · tem_nome · ativo
sms_agendados  id · grupo · mensagem · agendado_para_ms · agendado_para · status · criado_em · resultado
sms_disparos   id · job_id · grupo · mensagem · origem · iniciado_em · finalizado_em · total · enviados · falhas · resultado
```

- `sms_grupos` é o mapa grupo→aba **como dado, não como código**. Adicionar grupo é inserir linha.
- `sms_agendados.status`: `pendente → enviando → enviado | perdido | cancelado`.
- `agendado_para_ms` é epoch em número. Comparação de data como string funciona por acidente.
- `sms_disparos.job_id` é o identificador gerado pelo app, o que permite recuperar um disparo cuja resposta HTTP se perdeu.
- `sms_disparos` é a fonte do histórico — por isso o app não precisa da REST API do n8n, e tem
  uma única porta de comunicação com ele.

## Workflows do n8n

### `SMS — Enviar` (sub-workflow: o motor)

Entrada: `grupo`, `mensagem`, `jobId?`, `callbackUrl?`

```
Execute Workflow Trigger
→ Resolver Grupo          (lê sms_grupos → aba, tem_nome)
→ Ler Contatos            (Sheets, aba por expressão — um nó, não dois)
→ Normalizar Contatos     (limpa/valida telefone, remove vazios e duplicados)
→ Abrir Disparo           (insere linha em sms_disparos)
→ [callback: início + total]
→ Loop Contatos ─┬─(done)→ Consolidar → Fechar Disparo → [callback: fim] → return
                 └─(loop)→ Montar Mensagem ({{nome}})
                         → Enviar SMS (Zenvia)
                         → Sucesso? ─┬─ sim → Registrar Envio (Sheets: ultimo_envio)
                                     └─ não → Registrar Falha (código + corpo)
                         → [callback: progresso] → Wait 250ms → volta
```

Mudanças em relação ao workflow atual:

- **`Normalizar Contatos` é novo.** Hoje o telefone vai cru da planilha para a Zenvia
  (`String($json.telefone)`); célula com máscara ou linha em branco vira falha silenciosa.
- **`ultimo_envio` (timestamp) substitui `sms_enviado = 1`.** Coerente com "todos, sempre":
  a coluna registra, não trava.
- **`Wait 250ms`** entre contatos, contra 429 da Zenvia.
- **A esteira duplicada é eliminada.**

### `SMS — Webhook`

```
Webhook POST /sms-dispatch  (Header Auth: X-APP-TOKEN)
→ Respond to Webhook { ok, jobId }     ← responde aqui, na hora
→ Execute Workflow → SMS — Enviar      ← e segue rodando
```

### `SMS — Agendador`

```
Schedule Trigger (1 min)
→ Buscar Vencidos     (status = pendente E agendado_para_ms <= agora)
→ Loop ─→ Classificar Atraso
          ├─ atraso > 60min → Marcar Perdido
          └─ senão → Marcar ENVIANDO → Execute Workflow → Marcar Enviado + resultado
```

Marcar `enviando` **antes** de disparar é um lock otimista: garante que duas execuções
sobrepostas do agendador não disparem a mesma linha duas vezes.

### `SMS — Consultas`

Um webhook, Switch por `action`: `grupos` · `historico` · `agendamentos.listar` ·
`agendamentos.criar` · `agendamentos.cancelar`. A ação `grupos` percorre `sms_grupos`, lê cada
aba e devolve a contagem; o app guarda em cache por 60s.

### Autenticação

| Direção | Mecanismo |
|---|---|
| App → n8n | Header Auth `X-APP-TOKEN` nos dois webhooks |
| n8n → App (callbacks) | Header Auth próprio, credencial no n8n |

Nenhum token viaja no corpo da requisição.

## O app Next

**Stack:** Next 15 (App Router), TypeScript, HeroUI, Tailwind. Container Docker na mesma VPS.

```
app/
  login/page.tsx
  (app)/page.tsx              ← Compor: enviar agora OU agendar
  (app)/agendados/page.tsx    ← fila, com cancelar
  (app)/historico/page.tsx
  api/  login · groups · send · jobs/[jobId] · progress
        schedules · schedules/[id] · history
lib/
  n8n.ts       ← cliente único: token, timeout, tipos, tratamento de erro
  session.ts   ← cookie assinado (HMAC)
  jobs.ts      ← store de progresso em memória, com TTL
  sms.ts       ← segmentos GSM-7/UCS-2, normalização de telefone
  schema.ts    ← zod, compartilhado entre cliente e servidor
middleware.ts  ← protege tudo exceto /login e /api/progress
```

`lib/n8n.ts` é o único lugar que chama o n8n: onde o token é injetado, o timeout definido, e
onde "n8n fora do ar" vira erro tratado em vez de 500 cru.

### Tela de composição

Enviar agora e agendar são **o mesmo formulário**, com um toggle; agendar só acrescenta data e
hora. Separar em duas telas duplicaria editor, contador e seletor de grupo.

```
┌─────────────────────────────────────────┐
│  Grupo:  [ Encontristas ▾ ]  142 contatos│
│  ┌────────────────────────────────────┐  │
│  │ Olá {{nome}}, o encontro começa... │  │
│  └────────────────────────────────────┘  │
│  [+ {{nome}}]     118/70 · 2 SMS ⚠       │
│  ( • ) Enviar agora   (   ) Agendar      │
│                        [   Enviar   ]    │
└─────────────────────────────────────────┘
```

### Contagem de segmentos

SMS cobra por segmento: 160 caracteres em GSM-7, mas **70** assim que aparece um caractere fora
do alfabeto. `ã`, `õ`, `á`, `ê`, `ó` não estão no GSM-7 — praticamente toda mensagem em
português natural cai para 70 caracteres por segmento, dobrando o custo sem aviso visível.

O diálogo de confirmação fecha a conta em SMS cobrados:

> **Encontristas · 142 contatos**
> *"Olá {{nome}}, o encontro começa às 19h no salão."*
> 2 segmentos × 142 contatos = **284 SMS**

### Personalização

`{{nome}}` só é oferecido em grupos cuja aba tenha a coluna (`tem_nome`). Para linhas com a
célula vazia, a tela tem um campo *"sem nome, usar:"* com padrão `amigo(a)` — remover o
`{{nome}}` produziria `"Olá , tudo bem?"`.

### Progresso ao vivo

`lib/jobs.ts` guarda `Map<jobId, {total, sent, failed, status}>` em memória do processo, com
limpeza após 1h. O n8n empurra em `/api/progress`; o navegador puxa em `/api/jobs/:jobId` a cada
1,5s pelo hook `useJobProgress`, que para sozinho ao terminar.

`/api/progress` é a única rota fora do middleware de sessão — quem chama é o n8n. Tem token próprio.

### Sessão

Senha compartilhada em variável de ambiente, comparada com `timingSafeEqual`. Cookie `httpOnly`
+ `SameSite=Lax`, 12h. Limitador de tentativas por IP: senha única sem isso é alvo confortável
para força bruta, já que não há usuário a bloquear.

### Variáveis de ambiente

```
APP_PASSWORD          senha compartilhada
SESSION_SECRET        assinatura do cookie
N8N_BASE_URL          https://webhooks.aotomatika.com.br
N8N_APP_TOKEN         header X-APP-TOKEN enviado ao n8n
APP_CALLBACK_TOKEN    header exigido em /api/progress
APP_PUBLIC_URL        base do callbackUrl passado ao n8n
```

## Casos de borda

| Situação | Comportamento |
|---|---|
| Timeout em `/api/send` | Tela diz "não consegui confirmar" (não "falhou") e oferece consulta ao histórico pelo `jobId` |
| Clique duplo em Enviar | `jobId` repetido é ignorado no servidor (a deduplicação usa o store em memória), além do botão desabilitado |
| n8n fora do ar | Erro claro; nenhum SMS enviado, nada registrado |
| Google Sheets indisponível | O motor falha antes do loop — zero enviados, disparo com erro |
| Zenvia 429/5xx | Conta como falha, com código e corpo, e aparece no resumo |
| Aba renomeada | O grupo aparece com erro na lista, não com contagem zero |
| Telefone malformado / linha vazia | Descartado em `Normalizar`; o descarte entra no resumo |
| Contato duplicado na aba | Deduplicado |
| Mensagem vazia ou só espaços | Bloqueado no cliente e no servidor |
| Agendar para o passado | Bloqueado; mínimo de 2 minutos à frente |
| Cancelar agendamento em `enviando` | Recusado: "já começou a enviar" |
| Container do app reinicia no meio | Barra some, envio continua, resultado no histórico |
| n8n reinicia no meio | Execução interrompida; `ultimo_envio` na planilha registra quem já recebeu |

O `jobId` é gerado pelo app **antes** da chamada ao n8n. É isso que permite distinguir "nenhum
SMS enviado" de "não sei se foi enviado" — respostas diferentes que exigem ações diferentes.

## Fuso horário

Tudo persistido em UTC (epoch ms + ISO-8601). A tela lê e escreve em `America/Sao_Paulo`.

## Testes

**Unitários (Vitest):**
- `lib/sms.ts` — segmentos: exatamente 160, 161, mensagem com `ã` (cai para 70), 70, 71, emoji, vazia.
- Normalização de telefone: com DDD, sem DDD, com máscara, 8 dígitos, lixo.
- `session.ts` — cookie adulterado rejeitado; cookie expirado rejeitado.
- `jobs.ts` — TTL limpa; job inexistente não explode.

**Integração:** route handlers com n8n mockado. `/api/send` injeta token e trata timeout;
`/api/progress` recusa sem token; middleware barra sem cookie.

**E2E (Playwright):** um teste no caminho crítico — compor → confirmar → progresso → resumo,
com n8n mockado.

**Teste operacional (o que mais importa):** um grupo `Teste` em `sms_grupos` apontando para uma
aba com dois telefones do próprio dono. Envio real, Zenvia real, antes de qualquer grupo de verdade.

## Fora de escopo (v1)

- **Reenviar apenas as falhas.** Os números que falharam ficam gravados em
  `sms_disparos.resultado`, então isso entra depois sem migração.
- **Agendamento recorrente.** Decidido como pontual apenas.
- **Login por usuário / auditoria de quem disparou.** Senha única basta para o uso atual.

## Restrição conhecida

O store de progresso em memória é correto **porque a hospedagem é de instância única**. Se um dia
houver duas réplicas atrás de um balanceador, o polling passará a acertar a instância errada de
forma intermitente. Nesse cenário, o progresso precisa migrar para armazenamento compartilhado
(ou ser lido de `sms_disparos`).
