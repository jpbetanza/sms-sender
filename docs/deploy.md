# Deploy — Vercel

## Variáveis de ambiente

Quatro, todas em *Project Settings → Environment Variables*:

| Variável | O que é |
|---|---|
| `APP_PASSWORD` | Senha única de acesso à tela |
| `SESSION_SECRET` | Segredo que assina o cookie de sessão (`openssl rand -base64 32`) |
| `N8N_BASE_URL` | `https://webhooks.aotomatika.com.br` |
| `N8N_APP_TOKEN` | Valor do header `X-APP-TOKEN`, igual à credencial `App SMS Token` no n8n |

Não há mais `APP_CALLBACK_TOKEN` nem `APP_PUBLIC_URL`: o n8n não chama mais o app.

## Por que isso funciona em serverless

O progresso do envio **não vive na memória do app**. O motor grava `processados` na própria
linha de `sms_disparos` conforme envia, e a tela pergunta ao n8n a cada 2 segundos. Qualquer
instância responde a mesma coisa, então não importa em qual delas o polling cai.

Foi essa mudança que tornou a Vercel viável. Na versão anterior o progresso era um `Map` no
processo, e o callback do n8n chegava numa instância enquanto o navegador perguntava a outra —
a barra funcionaria de forma intermitente, que é pior do que não existir.

## O que o app faz por requisição

Toda rota é um proxy fino para um webhook do n8n: valida a entrada, injeta o `X-APP-TOKEN` e
devolve. Nada demora — o disparo em si roda no n8n, não aqui —, então os limites de duração de
função da Vercel não são um problema.

## Deploy

```bash
vercel --prod
```

Ou conectando o repositório pelo painel: `next build` é detectado sozinho, sem configuração.
