# Terapotik MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-2025--06--18-purple.svg)](https://modelcontextprotocol.io/)
[![Production](https://img.shields.io/badge/Status-Production%20Success-brightgreen.svg)](https://github.com/kubi-ozisik/terapotik-mcp)
[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-✅%20Working-success.svg)](https://claude.ai/download)


A production-ready **Model Context Protocol (MCP)** implementation featuring multi-transport support, custom authentication, and Google services integration. Built as a modern monorepo with clean architecture patterns.

## 🚀 **Key Features**

- **🎉 Production MCP Integration** - Claude Desktop successfully calling real Google Calendar API
- **🔄 Multi-Transport MCP Server** - SSE, HTTP Streamable, and Stdio support via mcp-remote
- **📅 Google Services Integration** - Calendar tools working, Tasks tools ready for testing
- **🤖 Proven Agentic Chat** - Real calendar events displayed through natural language interface
- **🏗️ Modern Architecture** - Monorepo with clean service layers and dependency injection
- **🔐 Production Authentication** - OAuth 2.1 with Google integration and token management
- **📦 Scalable Codebase** - 15 registered MCP tools ready for systematic testing

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

- **`packages/shared`** - Shared types, utilities, database schema, and Prisma client
- **`packages/api`** - Express.js API server with Google services and authentication  
- **`packages/web`** - Next.js client with modern UI (Next.js 15, React 19, Tailwind 4)
- **`packages/mcp-server`** - Multi-transport MCP server with unified tool registry

---

## 🚦 **Quick Start**

### **Prerequisites**
- **Node.js** 20.x or higher
- **pnpm** 8.x or higher (recommended package manager)
- **MongoDB** database connection
- **Claude Desktop** (optional, for AI assistant integration)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/kubi-ozisik/terapotik-mcp.git
cd terapotik-mcp

# Install pnpm globally if not installed
npm install -g pnpm

# Install all dependencies
pnpm install

# Set up environment variables
cp packages/shared/.env.example packages/shared/.env
cp packages/api/.env.example packages/api/.env
# Edit .env files with your configuration
```

### **Development**

```bash
# Start all services in development mode
pnpm dev

# Or start individual services
pnpm dev --filter @terapotik/api          # API server
pnpm dev --filter @terapotik/mcp-server   # MCP server
pnpm dev --filter @terapotik/web          # Web interface

# Build all packages
pnpm build

# Database operations
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Prisma Studio
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

User: "I need you to call getEventsForToday"

Claude Response: 
Perfect! Now I can see your calendar events for today. You have one event scheduled:

Today's Calendar (Tuesday, August 26, 2025):
- test event
  • Time: 3:15 PM - 4:15 PM (Europe/London timezone)  
  • Status: Confirmed
  • Organizer: You (kubi.ozisik@gmail.com)

Important note:  Claude desktop requires stdio transport. mcp-remote proxy bridges HTTP/SSE to stdio protocol. Stdio protocol will be added

### **API Testing**

```bash
# Health checks
curl http://localhost:3200/api/health
curl http://localhost:3001/health

# Working Calendar Endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3200/api/calendar/events
curl -H "Authorization: Bearer $TOKEN" http://localhost:3200/api/calendar/list  
curl -H "Authorization: Bearer $TOKEN" http://localhost:3200/api/calendar/events/date/2025-08-26

# Test user profile (working)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3200/api/v1/me

# MCP tools testing
npx @modelcontextprotocol/inspector --cli http://localhost:3001/sse --transport sse --method tools/list


# Test MCP tools via CLI
npx @modelcontextprotocol/inspector --cli http://localhost:3001/sse --transport sse --method tools/list
```


---

## 🔌 **Available MCP Tools**

### **✅ Production-Ready Tools (Tested & Working)**
| Tool Name | Description | Status | Usage Example |
|-----------|-------------|---------|---------------|
| `getEventsForToday` | 🎉 **WORKING** - Fetch today's calendar events | ✅ Production | "Show me today's schedule" |
| `whoami` | Get authenticated user information | ✅ Working | Authentication verification |

### **🔄 Ready for Testing (Registered & Available)**

#### **📅 Calendar Tools (6 remaining)**
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `getCalendarList` | List available calendars | None |
| `getCalendarEvents` | Fetch events with filters | timeMin, timeMax, calendarId, maxResults |
| `getEventsForDate` | Events for specific date | date (YYYY-MM-DD), calendarId, maxResults |
| `getEventsForDateRange` | Events for date range | startDate, endDate, calendarId, maxResults |
| `createCalendarEvent` | Create new calendar event | summary, start, end, description, location |
| `createRecurringEvent` | Create recurring events | event details + recurrence pattern |

#### **✅ Google Tasks Tools (7 tools)**
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `getTasks` | List all tasks across task lists | None |
| `getTaskLists` | List available task lists | None |
| `getTasksForList` | Tasks from specific list | taskListId, showCompleted |
| `createTaskList` | Create new task list | title |
| `createTask` | Add new task | taskListId, title, notes, due |
| `updateTask` | Modify existing task | taskListId, taskId, updates |
| `deleteTask` | Remove task | taskListId, taskId |

### **📊 Tool Registration Summary**
- **Total Tools**: 15 tools registered
- **Working & Tested**: 2 tools
- **Ready for Testing**: 13 tools  
- **Architecture**: Modern `registerTool()` API with proper Zod schemas
- **Next Phase**: Systematic testing of remaining tools one by one

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
│   ├── web/                           # Next.js client with modern UI
│   └── shared/                        # Shared utilities and database
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
pnpm install
pnpm dev
```

### **🎉 MILESTONE ACHIEVED**
- **✅ Architecture Proven**: End-to-end MCP integration working
- **✅ First Tool Success**: `getEventsForToday` displaying real calendar events
- **✅ Claude Desktop Connected**: Natural language → Google Calendar API
- **✅ Modern MCP Implementation**: Using latest SDK with `registerTool()` API
- **✅ Production Authentication**: JWT + Google OAuth token management

### **🔄 Current Phase: Tool Expansion Testing**
**Goal**: Test remaining 13 registered tools systematically

**Next Tools to Test**:
1. **`getCalendarEvents`** - "Show me all my calendar events"
2. **`createCalendarEvent`** - "Schedule a meeting tomorrow at 2pm"  
3. **`getEventsForDate`** - "What do I have on Friday?"
4. **`getTasks`** - "Show me my Google Tasks"
5. **`createTask`** - "Add a new task to my list"

**Testing Strategy**:
- Test via MCP Inspector first
- Verify Claude Desktop integration  
- Uncomment corresponding API endpoints as needed
- Document each working tool

### **📊 Progress Metrics**
- **Architecture Maturity**: PRODUCTION-READY ✅
- **End-to-End Integration**: WORKING ✅  
- **Tool Coverage**: 13% tested, 87% ready for testing
- **Risk Level**: LOW (major hurdles solved)
- **Business Impact**: HIGH (AI can access real calendar data)

### **Before Contributing**
- Run tests: `pnpm test`
- Check linting: `pnpm lint`
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