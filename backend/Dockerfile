FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

ENV DATABASE_URL="file:./data/dev.db"
ENV PORT=4000

RUN mkdir -p /app/data /app/prisma

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npx tsx src/index.ts"]
