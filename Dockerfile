# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY fe/package*.json ./fe/
COPY be/package*.json ./be/

# Install frontend dependencies and build
WORKDIR /app/fe
RUN npm install
COPY fe/ .
RUN npm run build

# Install backend dependencies
WORKDIR /app/be
RUN npm install --production
COPY be/ .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy backend and built frontend
COPY --from=builder /app/be ./be
COPY --from=builder /app/fe/build ./fe/build

WORKDIR /app/be

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
