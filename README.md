# Terapotik MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-2025--06--18-purple.svg)](https://modelcontextprotocol.io/)

A production-ready **Model Context Protocol (MCP)** implementation featuring multi-transport support, custom authentication, and Google services integration. Built as a modern monorepo with clean architecture patterns.

## 🚀 **Key Features**

- **🔄 Multi-Transport MCP Server** - SSE, HTTP Streamable, and Stdio support
- **🔐 Production Authentication** - Custom OAuth 2.1 with Auth0 integration  
- **📅 Google Services Integration** - Calendar, Tasks, and more via MCP tools
- **🤖 Agentic Chat Ready** - Built for resumable context and multi-step workflows
- **🏗️ Clean Architecture** - Layered services with dependency injection
- **📦 Monorepo Structure** - Organized, scalable, and maintainable codebase

---

## 🏗️ **Architecture**

```
┌─────────────────────┐
│   Terapotik Web     │ ← Next.js with agentic chat UI
│   (packages/web)    │
└─────────┬───────────┘
          │ Custom Auth + WebSocket
          │
┌─────────▼───────────┐
│   Terapotik API     │ ← Express.js with Google services
│   (packages/api)    │
└─────────┬───────────┘
          │ Internal HTTP API
          │
┌─────────▼───────────┐
│   MCP Server        │ ← Multi-transport MCP server
│   (packages/mcp-    │
│    server)          │
└─────────┬───────────┘
          │ MCP Protocol (stdio/SSE/HTTP)
          │
┌─────────▼───────────┐
│   Claude Desktop    │ ← AI assistant with tool access
│   + Other Clients   │
└─────────────────────┘
```

### **Package Structure**

- **`packages/mcp-server`** - Multi-transport MCP server with unified tool registry
- **`packages/api`** - Express.js API server with Google services and authentication
- **`packages/web`** - Next.js client with agentic chat interface *(coming soon)*
- **`packages/shared`** - Shared types, utilities, and configurations *(coming soon)*

---

## 🚦 **Quick Start**

### **Prerequisites**
- **Node.js** 20.x or higher
- **npm** 7.x or higher (for workspaces)
- **Claude Desktop** (optional, for AI assistant integration)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/kubi-ozisik/terapotik-mcp.git
cd terapotik-mcp

# Install all dependencies
npm install

# Set up environment variables
cp packages/mcp-server/.env.example packages/mcp-server/.env
cp packages/api/.env.example packages/api/.env
# Edit .env files with your configuration
```

### **Development**

```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev -w @terapotik/api          # API server (port 3200)
npm run dev -w @terapotik/mcp-server   # MCP server (ports 3001/3002)

# Build all packages
npm run build

# Production start
npm run start
```

---

## 🔧 **Configuration**

### **MCP Server Environment (`.env`)**
```env
# API Integration
API_BASE_URL=http://localhost:3200
API_TIMEOUT=10000
API_RETRIES=3

# Server Configuration
PORT=3001
NODE_ENV=development
```

### **API Server Environment (`.env`)**
```env
# Server Configuration
PORT=3200
NODE_ENV=development

# Authentication (Auth0)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=the-audience

# Google Services (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 🧪 **Testing & Integration**

### **MCP Inspector Testing**

```bash
# Start MCP Inspector for visual testing
npx @modelcontextprotocol/inspector

# Connect to:
# Transport: SSE
# URL: http://localhost:3001/sse
```

### **Claude Desktop Integration**

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "terapotik-mcp-server-local": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3001/sse"],
      "env": {
        "API_BASE_URL": "http://localhost:3200",
        "PORT": "3001"
      }
    }
  }
}
```

### **API Testing**

```bash
# Health checks
curl http://localhost:3200/api/health
curl http://localhost:3001/health

# Test user profile endpoint
curl http://localhost:3200/api/v1/me

# Test MCP tools via CLI
npx @modelcontextprotocol/inspector --cli http://localhost:3001/sse --transport sse --method tools/list
```

---

## 🔌 **Available MCP Tools**

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `get_current_time` | Get current timestamp | None |
| `get_user_profile` | Fetch user profile from Terapotik API | None |

*More tools coming soon: Google Calendar, Tasks, and custom workflows*

---

## 🛠️ **Transport Support**

### **Supported Transports**

| Transport | Port | Usage | Status |
|-----------|------|-------|---------|
| **SSE** | 3001 | MCP Inspector, OAuth clients | ✅ Production |
| **HTTP Streamable** | 3002 | Modern MCP clients | ✅ Production |
| **Stdio** | N/A | Claude Desktop (via proxy) | ✅ Working |

### **Client Compatibility**

- **✅ Claude Desktop** - via `mcp-remote` proxy
- **✅ MCP Inspector** - direct SSE connection
- **✅ Custom MCP Clients** - HTTP Streamable or SSE
- **🔄 Future Clients** - Direct stdio support planned

---

## 🗂️ **Project Structure**

```
terapotik-mcp/
├── packages/
│   ├── mcp-server/                    # Multi-transport MCP server
│   │   ├── src/
│   │   │   ├── mcp/                   # Transport implementations
│   │   │   ├── services/              # Business logic layer
│   │   │   ├── tools/                 # MCP tool definitions
│   │   │   ├── config/                # Configuration management
│   │   │   └── types/                 # TypeScript definitions
│   │   └── package.json
│   │
│   ├── api/                           # Terapotik API server
│   │   ├── src/
│   │   │   ├── app.ts                 # Express app configuration
│   │   │   ├── server.ts              # Server lifecycle
│   │   │   ├── middlewares/           # Auth and validation middleware
│   │   │   ├── routes/                # API route handlers
│   │   │   └── utils/                 # Utilities and helpers
│   │   └── package.json
│   │
│   ├── web/                           # Next.js client (planned)
│   └── shared/                        # Shared utilities (planned)
│
├── package.json                       # Root workspace configuration
├── tsconfig.json                      # Base TypeScript configuration
└── README.md                          # This file
```

---

## 🔄 **Development Workflow**

### **Adding New MCP Tools**

1. **Create tool class** in `packages/mcp-server/src/tools/`
2. **Register with UnifiedMcpServer** (auto-distributes to all transports)
3. **Add corresponding API endpoint** if needed
4. **Test with MCP Inspector**
5. **Verify Claude Desktop integration**

### **Adding API Endpoints**

1. **Create route handler** in `packages/api/src/routes/`
2. **Add middleware** for auth/validation as needed
3. **Create corresponding MCP tool** to expose via Claude Desktop
4. **Update API documentation**

---

## 🤝 **Contributing**

This project is actively developed and welcomes contributions!

### **Development Setup**
```bash
git clone https://github.com/kubi-ozisik/terapotik-mcp.git
cd terapotik-mcp
npm install
npm run dev
```

### **Before Contributing**
- Run tests: `npm test`
- Check linting: `npm run lint`
- Verify MCP compliance: Test with MCP Inspector

---

## 📚 **Learn More**

- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Official MCP documentation
- **[MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)** - Official TypeScript SDK
- **[MCP Inspector](https://github.com/modelcontextprotocol/inspector)** - Testing and debugging tool
- **[Claude Desktop](https://claude.ai/download)** - AI assistant with MCP support

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **[Anthropic](https://anthropic.com/)** for developing the Model Context Protocol
- **[MCP Community](https://github.com/modelcontextprotocol)** for the excellent TypeScript SDK
- **Contributors and early adopters** helping shape this implementation

---

**Built with ❤️ for the MCP ecosystem**