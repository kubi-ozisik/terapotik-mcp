# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/shared/package.json ./packages/shared/

# Copy Prisma schema before install
COPY packages/shared/prisma ./packages/shared/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/mcp-server/src ./packages/mcp-server/src
COPY packages/mcp-server/tsconfig.json ./packages/mcp-server/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY tsconfig.json ./

# Build shared package first, then MCP server
RUN pnpm --filter=@terapotik/shared run build
RUN pnpm --filter=@terapotik/mcp-server run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Change ownership of only the necessary files
RUN chown -R mcp:nodejs /app/packages/mcp-server/dist
RUN chown -R mcp:nodejs /app/packages/shared/dist
USER mcp

# Expose ports
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the server
CMD ["node", "packages/mcp-server/dist/index.js"]
