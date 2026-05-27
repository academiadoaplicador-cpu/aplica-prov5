# syntax=docker/dockerfile:1

# --- Desenvolvimento (Vite HMR) ---
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# --- Build do frontend ---
FROM node:22-alpine AS web-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG GEMINI_API_KEY=
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

RUN npm run build

# --- Build da API ---
FROM node:22-alpine AS api-builder

WORKDIR /api

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/ ./

RUN npm run build && npm ci --omit=dev

# --- Produção: Nginx + API no mesmo container (compatível com Coolify) ---
FROM node:22-alpine AS production

RUN apk add --no-cache nginx wget

WORKDIR /srv/api

COPY --from=api-builder /api/package.json /api/package-lock.json ./
COPY --from=api-builder /api/node_modules ./node_modules
COPY --from=api-builder /api/dist ./dist
COPY --from=api-builder /api/migrations ./migrations

COPY --from=web-builder /app/dist /srv/public

COPY docker/nginx.prod.conf /etc/nginx/http.d/default.conf
COPY docker/start-prod.sh /start-prod.sh
RUN chmod +x /start-prod.sh

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 80

CMD ["/start-prod.sh"]
