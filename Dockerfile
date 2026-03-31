FROM node:20-alpine

# curl é necessário para o health check do docker-compose
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm@9 && \
    NODE_ENV=development pnpm install --frozen-lockfile

COPY . .

# Build com NODE_ENV=development para garantir que devDependencies (vite, ts) sejam usados
RUN NODE_ENV=development npm run build

EXPOSE 9347

ENV NODE_ENV=production \
    PORT=9347 \
    HOST=0.0.0.0

# vite preview usa as flags de porta/host para ser acessível externamente
CMD ["pnpm", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "9347"]
