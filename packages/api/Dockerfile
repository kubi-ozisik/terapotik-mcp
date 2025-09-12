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

# Generate Prisma client
RUN pnpm --filter=@terapotik/shared run db:generate 

# Copy entire packages directory
COPY packages/ ./packages/
COPY tsconfig.json ./

# Copy pre-built shared package
COPY packages/shared/dist ./packages/shared/dist
COPY packages/shared/package.json ./packages/shared/

# Build only the API
RUN pnpm --filter=@terapotik/api run build

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
