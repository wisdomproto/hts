# ── Base ──
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Builder ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run migrations to validate schema (DB will be created at runtime by start.mjs)
RUN mkdir -p db && npx drizzle-kit migrate

# Remove DB before build to prevent SQLITE_BUSY (47 workers accessing same file)
RUN rm -f db/hts.db db/hts.db-wal db/hts.db-shm

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output (includes server.js, node_modules, db/, data/)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy startup script
COPY --from=builder /app/start.mjs ./start.mjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "start.mjs"]
