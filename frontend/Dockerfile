# ─── Stage 1 : Build React/Vite ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances en couche séparée (cache Docker)
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ─── Stage 2 : Serveur Nginx (production) ────────────────────────────────────
FROM nginx:alpine

# Remplace la config nginx par défaut (port 80 → 3000 + SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
