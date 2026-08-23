# Deploy

Container único na VPS, ao lado do n8n.

## Variáveis de ambiente

| Variável | O que é |
|---|---|
| `APP_PASSWORD` | Senha única de acesso à tela |
| `SESSION_SECRET` | Segredo que assina o cookie de sessão (`openssl rand -base64 32`) |
| `N8N_BASE_URL` | `https://webhooks.aotomatika.com.br` |
| `N8N_APP_TOKEN` | Valor do header `X-APP-TOKEN`, igual à credencial `App SMS Token` no n8n |
| `APP_CALLBACK_TOKEN` | Valor do header `X-CALLBACK-TOKEN`, igual à credencial `App Callback Token` |
| `APP_PUBLIC_URL` | URL pública do app |

## Duas coisas que quebram em silêncio se estiverem erradas

**`APP_PUBLIC_URL` precisa ser alcançável a partir do n8n**, não do seu navegador. É para
onde vão os callbacks de progresso. Com `localhost`, o envio funciona e a barra nunca anda.

**Uma réplica só.** O progresso ao vivo é um `Map` na memória do processo. Com duas réplicas
atrás de um balanceador, o polling do navegador acerta a instância errada de forma
intermitente — o pior tipo de bug. Se um dia precisar escalar, o progresso migra para
armazenamento compartilhado ou passa a ser lido de `sms_disparos`.

## Subir

```bash
docker compose build
docker compose up -d
```
