# Build and run HappyRobot (Next.js + custom server with WebSockets)
FROM node:20-alpine AS base

WORKDIR /app

# Install deps (including devDependencies for build and tsx for custom server)
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build Next.js and generate Prisma client
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image: run custom server (needs tsx to run TypeScript server)
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
RUN npm ci --omit=dev && npm install tsx --save

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.ts* ./
COPY --from=builder /app/tsconfig.json ./
# Generate Prisma client in runner (needed after fresh npm ci)
RUN npx prisma generate

EXPOSE 3000

# Run migrations then start the custom server (HTTP + WebSocket)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run server"]
