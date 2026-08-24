# ==========================================
# Multi-Stage Dockerfile for MakeMeShort
# ==========================================

# 1. Build Stage: compile native SQLite bindings
FROM node:22-alpine AS builder

WORKDIR /app

# Install native dependencies required by better-sqlite3 build
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Clean install only production dependencies
RUN npm ci --omit=dev

# 2. Production Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app

# Add dumb-init for proper PID 1 signal forwarding & process handling
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/makemeshort.sqlite

# Copy built node_modules and project source code
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY public ./public

# Create data directory for persistent SQLite database and set permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user for enhanced container security
USER node

# Persistent volume mount point for database
VOLUME ["/app/data"]

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server using dumb-init
CMD ["dumb-init", "node", "server/server.js"]
