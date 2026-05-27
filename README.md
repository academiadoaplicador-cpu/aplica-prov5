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
5. Acesse: **http://localhost:8080** (ou a porta definida em `APP_PORT`).

O Nginx serve o frontend e encaminha `/api` para a API. Banco e API não precisam ficar expostos publicamente se você usar apenas a porta do `app-prod`.

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

```powershell
curl http://localhost:8080/api/health
```

Resposta esperada: `{"status":"ok","database":"connected"}`

## Repositório

Código: [academiadoaplicador-cpu/aplica-prov5](https://github.com/academiadoaplicador-cpu/aplica-prov5)
