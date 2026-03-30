FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 3000 6969

ENV NODE_ENV=production

CMD ["npm", "run", "preview"]
