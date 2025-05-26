# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install pnpm globally and curl for health checks
RUN npm install -g pnpm && apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy frontend package.json
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY packages/frontend ./packages/frontend

# Build the application
WORKDIR /app/packages/frontend
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Install pnpm globally and curl for health checks
RUN npm install -g pnpm && apk add --no-cache curl

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy frontend package.json
COPY packages/frontend/package.json ./packages/frontend/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base /app/packages/frontend/.output ./packages/frontend/.output

# Set working directory to frontend
WORKDIR /app/packages/frontend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["node", ".output/server/index.mjs"] 