# ── Stage 1: Install ALL dependencies (dev + prod) for building ──────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json .npmrc ./

# --ignore-scripts: postinstall (patch-package && copy-sql-wasm) needs scripts/ +
# patches/ which aren't in this stage. It's re-run in the builder where they exist.
RUN npm ci --no-audit --no-fund --ignore-scripts

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

# Run the postinstall work here (deps installed with --ignore-scripts): apply
# patch-package patches to the build-time node_modules and generate the gitignored
# public/sql/sql-wasm.wasm so it flows into the runner image (line: COPY public).
RUN node_modules/.bin/patch-package && node scripts/copy-sql-wasm.mjs

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
# AdSense web display gate. MUST be declared as an ARG or Railway won't forward the
# service var into the build → the client bundle bakes it as undefined → AdSense stays
# dark despite NEXT_PUBLIC_ADSENSE_ENABLED=true in the runtime env.
# (Publisher id is not forwarded: adSensePolicy.ts defaults to the correct ca-pub-… id.)
ARG NEXT_PUBLIC_ADSENSE_ENABLED
# Teacher Pro checkout gate. Same trap as AdSense above, and it bit: the Polar till for
# Teacher Pro $9/mo is live and payable, but /teacher/upgrade's CTA no-ops because
# PageClient.tsx:19 reads this at BUILD time and it was never forwarded, so the client
# bundle bakes it as undefined. Declared here so Railway forwards the service var.
ARG NEXT_PUBLIC_CHECKOUT_ENABLED
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
# CDN base for heavy static media (music/sounds/showcase3d) — offloaded to Supabase Storage.
# When set, next build inlines CDN URLs via getAssetUrl(); when unset, assets serve from public/.
ARG NEXT_PUBLIC_ASSET_CDN_BASE
# Build-only secret (not baked into the final runner image — this stage is discarded).
# Lets the CDN sync below upload new/changed media. Never echoed.
ARG SUPABASE_SERVICE_ROLE_KEY

# Auto-sync new/changed media to the CDN bucket on every deploy (incremental;
# safe no-op when SERVICE key or CDN base is absent). Must run BEFORE the image
# strip in the runner stage so newly-added assets exist on the CDN before their
# local copies are dropped. node_modules (with @supabase/supabase-js) is present.
RUN node scripts/upload-static-cdn.mjs

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

# Image shrink: when the CDN is active, drop the fully-offloaded media dirs from
# the runtime image (~169MB). Gated on the SAME var that makes getAssetUrl emit
# CDN URLs, so files are removed only when references point elsewhere — no 404 risk.
# videos/ stays: wordhunt-promo* are not CDN-wrapped (referenced outside Showcase3DClient).
ARG NEXT_PUBLIC_ASSET_CDN_BASE
RUN if [ -n "$NEXT_PUBLIC_ASSET_CDN_BASE" ]; then \
      rm -rf public/music public/sounds public/showcase3d && \
      echo "CDN active — removed music/sounds/showcase3d from image"; \
    else echo "CDN base unset — keeping media in image"; fi

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
# Heap cap = 1536MB on the 2384MiB (2.5GB) Railway container. History: 1024 was
# too tight (V8 fatal "Ineffective mark-compacts" ~every 100min); it was bumped to
# 2048, but 2048 is 86% of the container — V8 defers major GC until near its cap,
# so old_space rides to ~1.9GB and RSS to ~2.0GB (83% of cgroup), tripping the
# memory watchdog and sitting one burst from a kernel SIGKILL (measured 2026-07-29:
# heapUsed floor ~700MB after GC, so no true leak — the cap just let it balloon).
# 1536 + ~280MB non-heap RSS ≈ 1836MB = 77% of container, under the 80% WARN, while
# leaving ~800MB of live-set headroom for loaded games (old crashing 1024 had ~250MB).
# The memoryWatchdog boot guard alerts if cap ever exceeds 80% of container again.
# If loaded (many-game) heapUsed post-GC nears ~1.2GB, the fix is a BIGGER CONTAINER,
# never a bigger cap (a cap >80% of RAM recreates this).
ENV NODE_OPTIONS="--max-old-space-size=1536"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health/live || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
