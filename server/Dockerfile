# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# --- Desenvolvimento (hot reload) ---
FROM base AS development

EXPOSE 4000

CMD ["npm", "run", "dev"]

# --- Produção ---
FROM base AS production

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "run", "start"]
