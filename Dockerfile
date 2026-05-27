# syntax=docker/dockerfile:1

# --- Desenvolvimento (Vite HMR) ---
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# --- Build frontend + API em sequência (menor pico de RAM no Coolify/VPS) ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG GEMINI_API_KEY=
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV NODE_OPTIONS=--max-old-space-size=768

RUN npm run build

WORKDIR /api

COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY server/ ./

RUN npm run build && npm ci --omit=dev --no-audit --no-fund

# --- Produção: Nginx + API no mesmo container (compatível com Coolify) ---
FROM node:22-alpine AS production

RUN apk add --no-cache nginx wget \
  && mkdir -p /run/nginx /var/lib/nginx/tmp /var/log/nginx /etc/nginx/http.d

WORKDIR /srv/api

COPY --from=builder /api/package.json /api/package-lock.json ./
COPY --from=builder /api/node_modules ./node_modules
COPY --from=builder /api/dist ./dist
COPY --from=builder /api/migrations ./migrations

COPY --from=builder /app/dist /srv/public

COPY docker/nginx.prod.conf /etc/nginx/http.d/default.conf
COPY docker/start-prod.sh /start-prod.sh
RUN chmod +x /start-prod.sh && nginx -t

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 80

CMD ["/start-prod.sh"]
