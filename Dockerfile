# ============================================================================
# JPD to GitHub Connector - Production Dockerfile
# ============================================================================
#
# Multi-stage build for optimal image size and security
#
# Build: docker build -t jpd-github-sync .
# Run:   docker run --env-file .env jpd-github-sync
#
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.20.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# ============================================================================
# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.20.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/examples ./examples

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Default command: run the sync
CMD ["node", "dist/index.cjs"]

# Labels
LABEL org.opencontainers.image.title="JPD to GitHub Connector" \
      org.opencontainers.image.description="Bidirectional sync between Jira Product Discovery and GitHub Issues" \
      org.opencontainers.image.vendor="Expedition" \
      org.opencontainers.image.url="https://github.com/your-org/jpd-to-github-connector" \
      org.opencontainers.image.source="https://github.com/your-org/jpd-to-github-connector"

