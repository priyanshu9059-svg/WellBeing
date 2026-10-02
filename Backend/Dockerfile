FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma

COPY tsconfig.json ./
COPY src ./src

ENV PORT=4000

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
