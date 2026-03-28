# ── Stage 1: Install ALL dependencies (dev + prod) for building ──────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only package files — source changes won't bust this layer
COPY fe-next/package.json fe-next/package-lock.json ./

RUN npm ci --no-audit --no-fund

# ── Stage 2: Production deps only ────────────────────────────────────
# Separate stage for lean production node_modules that includes ALL
# runtime packages the custom Express server needs (socket.io, ioredis,
# express, compression, tRPC, etc.) — standalone tracing misses these.
FROM node:22-alpine AS proddeps

WORKDIR /app

COPY fe-next/package.json fe-next/package-lock.json ./

RUN npm ci --no-audit --no-fund --omit=dev

# ── Stage 3: Build Next.js (standalone) + bundle server ──────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Reuse cached node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY fe-next/ ./

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js with standalone output → .next/standalone/
RUN npm run build --ignore-scripts

# Bundle the custom Express server with esbuild → dist/server.cjs
# This replaces runtime tsx transpilation for faster cold starts
RUN node scripts/bundle-server.mjs

# ── Stage 4: Production image (slim) ─────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Combine apk + supabase CLI into one layer to reduce layer count
RUN apk add --no-cache curl bash && \
    (curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash || \
     wget -qO- https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin)

# Production node_modules for Express server externals (socket.io, ioredis, etc.)
# Copied FIRST so standalone's traced node_modules overlay correctly
COPY --from=proddeps --chown=node:node /app/node_modules ./node_modules

# Next.js standalone output overlays on top (has its own traced deps in node_modules/)
COPY --from=builder --chown=node:node --link /app/.next/standalone ./

# Copy static assets and public (not included in standalone output)
COPY --from=builder --chown=node:node --link /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Copy bundled server + worker + dictionary files
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy dictionary txt files to app root for dictionaryEnrichment.ts
# (uses path.resolve(__dirname, '../hebrew_words_approved.txt') from dist/)
COPY --from=builder --chown=node:node /app/backend/*.txt ./

# Copy supabase migrations
COPY --from=builder --chown=node:node /app/supabase ./supabase

# Copy scripts
COPY --from=builder --chown=node:node /app/scripts/docker-migrate.sh /app/scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/*.sh

# Run as non-root for security (node user exists in node:alpine)
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health/live || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
