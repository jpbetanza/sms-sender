# Recursos do n8n

Referência dos IDs que as Tasks 8–10 (workflows) e a Task 11 (rotas do app) precisam.
Todos os recursos vivem no projeto pessoal do dono.

- **Project ID:** `rXHs40RzCFYQvu4U`
- **Workflow existente:** `SMS` — `pzixxpeArkDYBco3` (legado, ainda ativo)
- **Sub-workflow `SMS — Enviar`:** `Fbfh7IxDLO5MH0Hh` (Task 8 — o motor de envio)

## Data Tables

Criadas na Task 7.

| Tabela | ID |
|---|---|
| `sms_grupos` | `nmOzGFl5LoqsdBpv` |
| `sms_agendados` | `pTLZA4iABXiRr3NO` |
| `sms_disparos` | `u45BtnWsVOSRyQDr` |

### `sms_grupos` — `nmOzGFl5LoqsdBpv`

Mapa dos grupos: liga a chave usada pelo app à aba da planilha.

| Coluna | Tipo |
|---|---|
| `chave` | string |
| `label` | string |
| `aba` | string |
| `tem_nome` | boolean |
| `ativo` | boolean |

Carga inicial (3 linhas, nesta ordem):

| chave | label | aba | tem_nome | ativo |
|---|---|---|---|---|
| `teste` | Teste | `Teste` | true | true |
| `encontristas` | Encontristas | `Contatos` | true | true |
| `equipistas` | Equipistas | `Vigilia` | false | true |

### `sms_agendados` — `pTLZA4iABXiRr3NO`

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

`agendado_para_ms` é **number** de propósito: o agendador compara esse valor com o
horário atual. Comparar data como string funciona por acidente e quebra quando o
formato mudar.

### `sms_disparos` — `u45BtnWsVOSRyQDr`

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
| `resultado` | string (JSON — inclui os telefones que falharam) |

## Credenciais

| Nome | ID | Tipo | Header |
|---|---|---|---|
| `Zenvia API Key` | `GBqxcf5rc5oDNsBg` | `httpHeaderAuth` | `X-API-TOKEN` |
| `App Callback Token` | `7I6MS6SniVaPXuUm` | `httpHeaderAuth` | `X-CALLBACK-TOKEN` |
| `Google Sheets account` | `bXEzX3P6P7n7wUaF` | `googleSheetsOAuth2Api` | — |

As credenciais de **Header Auth genérico** não podem ser anexadas a nós HTTP Request
pelo MCP do n8n (a validação do servidor só aceita a chave `httpSslAuth` nesse tipo de
nó). Os quatro nós HTTP de `SMS — Enviar` — `Enviar SMS`, `Avisar Inicio`,
`Avisar Progresso` e `Avisar Fim` — precisam ter a credencial escolhida à mão na
interface do n8n.

## Planilha

Documento de contatos: `1X1fmj9BGzEc_RsSR0bVPsAWdF9FWi4Iiwyj7-3anKgU`.
Abas referenciadas por `sms_grupos`: `Teste`, `Contatos`, `Vigilia`.

A aba `Teste` (cabeçalhos `nome` e `telefone`, com telefones do próprio dono) é
criada pelo dono do projeto — não foi criada na Task 7.

## Workflows (Tasks 9 e 10)

| Workflow | ID | Estado |
|---|---|---|
| `SMS — Enviar` (motor) | `Fbfh7IxDLO5MH0Hh` | **não publicado** — publish bloqueado pelo classificador |
| `SMS — Webhook` (`POST /webhook/sms-dispatch`) | `D7j3aHaszJf6j10K` | não publicado |
| `SMS — Consultas` (`POST /webhook/sms-consultas`) | `DdAeVJdOWOvPvKW3` | **publicado e testado** |
| `SMS — Agendador` (a cada 1 min) | `kNf80T1y0ZSO6V4T` | não publicado (de propósito) |

Credenciais: `App SMS Token` (`UVCzLtlNgtNuO5Pc`) anexada nos dois webhooks — o nó Webhook aceita
credencial via MCP, ao contrário do HTTP Request.

### Pendências do dono
1. Anexar credenciais nos 4 nós HTTP de `SMS — Enviar`: `Enviar SMS` → `Zenvia API Key`;
   `Avisar Inicio` / `Avisar Progresso` / `Avisar Fim` → `App Callback Token`.
2. Publicar `SMS — Enviar` e `SMS — Webhook`.
3. A aba `Contatos` da planilha não pôde ser lida (as outras duas leram). Conferir o nome real
   da aba e corrigir a coluna `aba` da linha `encontristas` em `sms_grupos`.
4. Aba `Teste` tem 1 contato; o plano prevê 2.

## Grupos passaram a vir da planilha (2026-08-22)

A tabela `sms_grupos` **não é mais usada** e pode ser apagada. Cada aba da planilha é um grupo.

- `SMS — Consultas` · ação `grupos`: `Listar Abas` (HTTP → API do Sheets) → `Extrair Abas` →
  loop lendo cada aba → `Contar`. Aba sem coluna `telefone`, vazia, ou ilegível volta com `erro`
  preenchido e fica desabilitada na tela.
- `SMS — Enviar` · `Resolver Grupo` virou um Set: `aba = {{ $json.grupo }}`. O nome do grupo
  **é** o nome da aba.
- Contrato de resposta inalterado (`id, label, count, tem_nome, sem_nome, erro`), então a
  interface não precisou mudar.

Descoberto na primeira execução: a aba `Contatos` não existe mais na planilha — só `Teste` e
`Vigilia`. O mapeamento antigo guardava o nome em cache e escondia isso.

## Contato avulso (2026-08-23)

Envio para um telefone digitado na hora, sem passar pela planilha. Mesmo motor, mesmo histórico —
só entra por um caminho diferente logo no início de `SMS — Enviar`.

- **App:** `POST /api/send` e `POST /api/schedules` aceitam `{ modo: "contato", telefone,
  nomeContato?, mensagem }` além do formato de grupo existente. `lib/schema.ts` normaliza o
  telefone digitado (com ou sem `+55`) antes de mandar para o n8n.
- **`SMS — Enviar`:** `Receber Pedido` ganhou `telefone` e `nomeContato`. Logo depois de
  `Resolver Grupo`, o nó `Tem Telefone Avulso?` decide: telefone preenchido pula `Ler Contatos`
  (Google Sheets) e vai para `Contato Avulso` (Code), que emula uma linha de planilha
  `{telefone, nome}` — o resto do motor (normalização, Zenvia, `Marcar Sucesso`/`Falha`,
  consolidação) é o mesmo para os dois caminhos. `Normalizar Contatos` rotula o disparo como
  `Avulso · <telefone>` no histórico quando não há grupo. O nó `Tem Linha?`, antes de
  `Registrar Envio`, impede que um contato avulso (sem linha de planilha) dispare uma escrita no
  Google Sheets.
- **`SMS — Webhook`:** `Executar Envio` repassa `telefone`/`nomeContato` do corpo do webhook.
- **`sms_agendados`:** ganhou as colunas `telefone` e `nome_contato` (strings, vazias para
  agendamentos de grupo). `SMS — Consultas` · `Criar Agendamento` grava os dois campos e usa
  `Avulso · <telefone>` como `grupo` quando não há grupo, só para exibição na tela de agendados.
- **`SMS — Agendador`:** `Executar Envio` repassa `telefone`/`nome_contato` da linha vencida para
  o motor, do mesmo jeito que já repassava `grupo`/`fallback_nome`.

Discriminador: **presença de `telefone` não vazio**, nunca ausência de `grupo` — um agendamento
avulso chega ao motor com `grupo` já preenchido (`Avulso · <telefone>`, escrito na criação do
agendamento), então checar "grupo vazio" quebraria esse caminho.
