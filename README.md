# Aplica PRO

Sistema de orçamentos e gestão para aplicadores de película (PPF, envelopamento, eletrodomésticos).

## Desenvolvimento local (Docker)

1. Copie as variáveis de ambiente:
   ```powershell
   copy .env.example .env.local
   ```
2. Ajuste `.env.local` se necessário (admin dev, JWT, etc.).
3. Suba o ambiente:
   ```powershell
   npm run docker:dev
   ```
4. Acesse: **http://localhost:3000** (API em **http://localhost:4000**).

## Produção (Docker)

1. Copie e preencha o arquivo de produção:
   ```powershell
   copy .env.production.example .env.production
   ```
2. Defina obrigatoriamente:
   - `JWT_SECRET` (≥ 32 caracteres)
   - `POSTGRES_PASSWORD` forte
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   - `CORS_ORIGIN` e `APP_URL` com a URL pública (ex.: `https://app.seudominio.com.br`)
3. Na **primeira** implantação, use `ENABLE_ADMIN_BOOTSTRAP=true`; depois altere para `false`.
4. Suba em produção:
   ```powershell
   npm run docker:prod
   ```
5. No **Coolify**:
   - **Docker Compose file:** `docker-compose.prod.yml` (só `db` + `app-prod`, sem build de dev)
   - **Variáveis:** `COMPOSE_PROFILES` não é necessário com esse arquivo
   - Domínio **somente** no serviço `app-prod`, porta **80**
   - Frontend e API no **mesmo container** (Nginx → API em `localhost:4000`)

Se o deploy falhar com exit code **255** durante `npm ci`, costuma ser **falta de RAM** na VPS. O `Dockerfile` faz build em sequência para reduzir o pico de memória; se persistir, aumente RAM ou swap no servidor.

Para teste local com porta no host, use `docker-compose.override.yml` com `ports: ["8080:80"]` no serviço `app-prod`.

O Nginx serve o frontend e encaminha `/api` para a API.

### Checklist de produção

| Item | Status |
|------|--------|
| `.env.production` preenchido (não commitar) | ☐ |
| `JWT_SECRET` ≥ 32 caracteres | ☐ |
| Senhas fortes (Postgres + admin) | ☐ |
| `ENABLE_ADMIN_BOOTSTRAP=false` após 1º deploy | ☐ |
| HTTPS no proxy reverso (Nginx/Caddy/Traefik na VPS) | ☐ |
| Backup do volume `postgres_data` | ☐ |

### Health check

**Página de status (navegador):** `/status` ou `/api/health` — painel no estilo status page (componentes, operacional/indisponível).

**Monitoramento (JSON):**

```powershell
curl -H "Accept: application/json" https://app.aplicapro.com.br/api/health
```

Resposta esperada: `{"status":"ok","database":"connected",...}`

## Repositório

Código: [academiadoaplicador-cpu/aplica-prov5](https://github.com/academiadoaplicador-cpu/aplica-prov5)
