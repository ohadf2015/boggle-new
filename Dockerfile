# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY fe-next/package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY fe-next/ ./

# Build Next.js app (without postbuild migration - handled at runtime)
RUN npm run build --ignore-scripts

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck and bash for scripts
RUN apk add --no-cache curl bash

# Install Supabase CLI for migrations
RUN curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash || \
    (wget -qO- https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin)

# Copy built app and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/contexts ./contexts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/hooks ./hooks
COPY --from=builder /app/supabase ./supabase

# Copy scripts
COPY scripts/docker-migrate.sh ./scripts/docker-migrate.sh
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/*.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

# Run entrypoint (migrations + server)
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
