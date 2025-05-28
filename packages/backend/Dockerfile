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

# Copy backend package.json
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY packages/backend ./packages/backend

# Build the application
WORKDIR /app/packages/backend
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

# Copy backend package.json
COPY packages/backend/package.json ./packages/backend/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base /app/packages/backend/dist ./packages/backend/dist

# Set working directory to backend
WORKDIR /app/packages/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["pnpm", "start:prod"] 