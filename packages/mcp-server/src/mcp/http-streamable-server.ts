import express, { Express, Request, Response } from "express";
import cors from "cors";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from "crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

interface SessionData {
  transport: StreamableHTTPServerTransport;
  mcpServer: McpServer;
  createdAt: number;
  lastAccessed: number;
  authInfo?: any; // For future OAuth integration
}

/**
 * HTTP Streamable MCP server - true MCP protocol over HTTP with session management
 */
export class HttpStreamableServer {
  private app: Express;
  private sessions: Map<string, SessionData> = new Map();
  private port: number;
  private serverName: string;
  private serverVersion: string;

  constructor(serverName: string, serverVersion: string, port: number) {
    this.serverName = serverName;
    this.serverVersion = serverVersion;
    this.port = port;
    
    // Initialize Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    
    // Cleanup old sessions every 5 minutes
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors({
      exposedHeaders: ['Mcp-Session-Id', 'mcp-session-id'],
      allowedHeaders: ['Content-Type', 'Accept', 'mcp-session-id', 'Mcp-Session-Id', 'authorization'],
    }));
    this.app.use(express.json());
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Main MCP endpoint for HTTP streamable transport
    this.app.post('/mcp', async (req, res) => {
      await this.handleMcpRequest(req, res);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: "ok",
        service: this.serverName,
        version: this.serverVersion,
        transport: "http-streamable",
        timestamp: new Date().toISOString(),
        activeSessions: this.sessions.size
      });
    });

    // OAuth discovery endpoints (for future)
    this.app.get('/.well-known/oauth-authorization-server', (req, res) => {
      res.json({
        issuer: `http://localhost:${this.port}`,
        authorization_endpoint: `http://localhost:${this.port}/authorize`,
        token_endpoint: `http://localhost:${this.port}/token`,
        // TODO: Implement OAuth endpoints
      });
    });
  }

  /**
   * Handle MCP HTTP streamable requests - core of the implementation
   */
  private async handleMcpRequest(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let sessionData: SessionData;

      if (sessionId && this.sessions.has(sessionId)) {
        // Reuse existing session
        sessionData = this.sessions.get(sessionId)!;
        sessionData.lastAccessed = Date.now();
        process.stderr.write(`Reusing session: ${sessionId}\n`);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request - create session
        const newSessionId = randomUUID();
        process.stderr.write(`Creating new session: ${newSessionId}\n`);
        
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (sessionId) => {
            process.stderr.write(`Session initialized: ${sessionId}\n`);
          },
        });

        // Create MCP server for this session
        const mcpServer = new McpServer({
          name: this.serverName,
          version: this.serverVersion,
        });

        // Register whoami tool
        this.registerWhoamiTool(mcpServer);

        // Store session data
        sessionData = {
          transport,
          mcpServer,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
        };

        this.sessions.set(newSessionId, sessionData);

        // Set session ID header for client
        res.setHeader('Mcp-Session-Id', newSessionId);
        process.stderr.write(`Setting session ID header: ${newSessionId}\n`);

        // Connect transport to MCP server
        await sessionData.mcpServer.connect(sessionData.transport);
        process.stderr.write(`MCP server connected to transport for session: ${newSessionId}\n`);
        
        // Clean up session when transport closes
        sessionData.transport.onclose = () => {
          this.sessions.delete(newSessionId);
          process.stderr.write(`Session closed and cleaned up: ${newSessionId}\n`);
        };

      } else {
        // Invalid request - no session ID and not an initialize request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or missing initialization',
          },
          id: null,
        });
        return;
      }

      // Handle the request through the transport
      await sessionData.transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      process.stderr.write(`Error handling HTTP streamable MCP request: ${error}\n`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  }

  /**
   * Register the whoami tool - reusing your existing pattern
   */
  private registerWhoamiTool(server: McpServer): void {
    server.registerTool(
      "whoami",
      {
        title: "Who Am I",
        description: "Get information about the current user session", 
        inputSchema: {} // No input parameters
      },
      async (params, context) => {
        console.log("whoami tool called");
        console.log("params", params);
        console.log("context", context);
        try {
          // For HTTP transport, we don't have full auth context yet
          // But we can return session information
          return {
            content: [
              {
                type: "text",
                text: `HTTP Streamable Session Info:
  Transport: HTTP Streamable
  Server: ${this.serverName} v${this.serverVersion}  
  Session Count: ${this.sessions.size}
  Request Time: ${new Date().toISOString()}
  
  Note: Full authentication will be implemented in OAuth integration.`
              }
            ]
          };
        } catch (error) {
          console.error("Error in whoami tool:", error);
          return {
            content: [
              {
                type: "text",
                text: "Error retrieving session information.",
              },
            ],
          };
        }
      }
    );
  }

  /**
   * Cleanup old sessions (prevent memory leaks)
   */
  private cleanupSessions(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now - sessionData.lastAccessed > maxAge) {
        sessionData.transport.close?.();
        this.sessions.delete(sessionId);
        process.stderr.write(`Cleaned up inactive session: ${sessionId}\n`);
      }
    }
  }

  /**
   * Get active session count
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Start the HTTP streamable server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      process.stderr.write(`HTTP Streamable MCP Server running on port ${this.port}\n`);
      process.stderr.write(`Health check: http://localhost:${this.port}/health\n`);
      process.stderr.write(`MCP endpoint: POST http://localhost:${this.port}/mcp\n`);
    });
  }

  /**
   * Stop the server and cleanup all sessions
   */
  public stop(): void {
    // Close all active sessions
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      sessionData.transport.close?.();
    }
    this.sessions.clear();
    process.stderr.write('HTTP Streamable MCP Server stopped\n');
  }

  /**
   * Get the Express app (for integration with unified server)
   */
  public getApp(): Express {
    return this.app;
  }
}