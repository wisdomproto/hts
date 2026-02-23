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

# Create empty DB with schema via migrations
RUN mkdir -p db && npx drizzle-kit migrate

# Build Next.js (standalone mode copies db/, data/ etc. into .next/standalone/)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone already includes db/, data/, server.js, node_modules subset
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ensure SQLite writable (WAL mode needs write on db dir)
RUN chown -R nextjs:nodejs /app/db /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
