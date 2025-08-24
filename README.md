# Terapotik MCP

A  Model Context Protocol implementation with streamable HTTP transport, custom authentication, and agentic chat capabilities.

## Architecture

- `packages/mcp-server` - MCP server with streamable HTTP
- `packages/api` - Express.js API with custom auth and Google services
- `packages/web` - Next.js client with agentic chat UI
- `packages/shared` - Shared types and utilities

## Development

```bash
# Install dependencies
npm install

# Start all services in development mode
npm run dev

# Build all packages
npm run build

# Run in dev mode
npm run dev -w @terapotik/mcp-server
npm run dev -w @terapotik/api
