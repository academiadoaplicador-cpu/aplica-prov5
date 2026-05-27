# syntax=docker/dockerfile:1

# --- Desenvolvimento (Vite HMR) ---
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# --- Build de produção ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG GEMINI_API_KEY=
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

RUN npm run build

# --- Servidor estático (produção) ---
FROM nginx:1.27-alpine AS production

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
