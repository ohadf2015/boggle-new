# ─── Stage 1: Dependencies ────────────────────────────────────────────
# Cached as long as package.json + package-lock.json don't change.
# On Railway with Docker builder, this saves ~60-90s per deploy.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
# Full install (dev + prod) for building
RUN npm ci --prefer-offline

# ─── Stage 2: Production deps only ───────────────────────────────────
# Separate stage for lean production node_modules
FROM node:22-alpine AS proddeps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --prefer-offline --omit=dev

# ─── Stage 3: Build ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Express server bundle (esbuild — ~2s)
RUN node scripts/bundle-server.mjs

# Build schemas + Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 4: Production ─────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next/cache && chown nextjs:nodejs .next/cache

# Production node_modules for Express server externals (socket.io, ioredis, etc.)
# Copied FIRST so standalone's traced node_modules overlay correctly
COPY --from=proddeps /app/node_modules ./node_modules

# Next.js standalone output overlays on top (has its own traced deps in node_modules/)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Custom Express server bundle + runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend/*.txt ./backend/
COPY --from=builder /app/backend/data ./backend/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "dist/server.cjs"]
