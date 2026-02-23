# ── Base ──
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ sqlite

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

# Build Next.js (DB will be created at runtime via volume)
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p db && npx drizzle-kit migrate && npm run build

# ── Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache sqlite

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/db ./db
COPY --from=builder /app/data ./data
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/docker-entrypoint.sh ./

# Ensure directories are writable
RUN mkdir -p /app/db /app/data && \
    chown -R nextjs:nodejs /app/db /app/data && \
    chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "./docker-entrypoint.sh"]
