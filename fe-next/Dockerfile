# ── Stage 1: Install ALL dependencies (dev + prod) for building ──────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json .npmrc ./

RUN npm ci --no-audit --no-fund

# ── Stage 2: Production deps only ────────────────────────────────────
# Separate stage for lean production node_modules that includes ALL
# runtime packages the custom Express server needs (socket.io, ioredis,
# express, compression, tRPC, etc.) — standalone tracing misses these.
FROM node:22-alpine AS proddeps

WORKDIR /app

COPY package.json package-lock.json .npmrc ./

RUN npm ci --no-audit --no-fund --omit=dev --ignore-scripts

# ── Stage 3: Build Next.js (standalone) + bundle server ──────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars must be present at build time — Next.js inlines them into client JS.
# Railway automatically forwards env vars matching ARG names as build args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ARG NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
ARG NEXT_PUBLIC_CRAZYGAMES_ENABLED
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

# Compile CJS schemas first (bundle-server expects backend/dist/ to exist for copy step)
RUN npm run build:schemas

# Build the Express server bundle (esbuild — ~2s)
RUN node scripts/bundle-server.mjs

# Build Next.js with standalone output → .next/standalone/
RUN npm run build --ignore-scripts

# ── Stage 4: Production image (slim) ─────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Combine apk + supabase CLI into one layer to reduce layer count
RUN apk add --no-cache curl bash && \
    (curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash || \
     wget -qO- https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin)

# Production node_modules for Express server externals (socket.io, ioredis, etc.)
# Copied FIRST so standalone's traced node_modules overlay correctly
COPY --from=proddeps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Next.js standalone output overlays on top (has its own traced deps in node_modules/)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Custom Express server bundle + runtime files
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/backend/*.txt ./backend/
COPY --from=builder --chown=nextjs:nodejs /app/backend/data ./backend/data

# Copy supabase migrations
COPY --from=builder --chown=nextjs:nodejs /app/supabase ./supabase

# Copy docker scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-migrate.sh /app/scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/*.sh

# Create cache dir AFTER all COPY steps so it isn't overwritten
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-old-space-size=1024"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health/live || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
