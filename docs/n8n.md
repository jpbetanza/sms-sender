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
