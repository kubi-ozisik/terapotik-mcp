# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copy Prisma schema before install
COPY packages/shared/prisma ./packages/shared/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY tsconfig.json ./

# Build the application
RUN pnpm run build --filter=@terapotik/api

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S api -u 1001

# Change ownership of the app directory
RUN chown -R api:nodejs /app
USER api

# Expose port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3200/api/v1/health || exit 1

# Start the server
CMD ["node", "/app/packages/api/dist/server.js"]
