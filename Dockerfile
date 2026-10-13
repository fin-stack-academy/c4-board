# C4 Board (fin-stack academy) — imagem para uso local.
# O app e um site estatico (Vite): a primeira etapa instala, testa e gera o
# dist/; a segunda so serve os arquivos com nginx, sem root.

FROM node:22.12-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY test ./test
COPY assets/img ./assets/img
# A imagem so e gerada se a geracao dos diagramas passar nos testes.
RUN npm test && npm run build

FROM nginxinc/nginx-unprivileged:1.27.3-alpine
LABEL org.opencontainers.image.title="C4 Board" \
      org.opencontainers.image.description="Editor de diagramas C4 da fin-stack academy" \
      org.opencontainers.image.vendor="fin-stack academy" \
      org.opencontainers.image.licenses="MIT"
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
