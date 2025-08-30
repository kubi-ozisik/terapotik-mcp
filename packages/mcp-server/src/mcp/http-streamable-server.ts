import express, { Express, Request, Response } from "express";
import cors from "cors";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from "crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getEventsForTodayInputSchema, getEventsForTodayToolInfo } from "../tools/calendar";
import { TerapotikApiClient } from "../services/terapotik-api-client";

interface SessionData {
  transport: StreamableHTTPServerTransport;
  mcpServer: McpServer;
  createdAt: number;
  lastAccessed: number;
  authInfo?: {
    userId: string;
    clientId: string;
    token: string;
    client: any;
  };
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
      // check for authentication
      const authHeader = req.headers.authorization;
      let authInfo = null;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        authInfo = await this.validateTokenAndGetUserInfo(token);
      }

      let sessionData: SessionData;

      if (sessionId && this.sessions.has(sessionId)) {
        // Reuse existing session
        sessionData = this.sessions.get(sessionId)!;
        if (authInfo) {
          sessionData.authInfo = authInfo;
        }
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
        this.registerGetEventsForTodayTool(mcpServer);
        // Store session data
        sessionData = {
          transport,
          mcpServer,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          authInfo: authInfo,
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
        description: "Get information about the current authenticated user",
        inputSchema: {}
      },
      async (params, context) => {
        try {
          // Get session data using session ID from context
          const sessionId = context.sessionId;
          const sessionData = this.sessions.get(sessionId!);
          console.log("sessionData", sessionData);

          if (!sessionData?.authInfo) {
            return {
              content: [{
                type: "text",
                text: `Session Info:
    Session ID: ${sessionId}
    Transport: HTTP Streamable
    Status: Not authenticated
    
    To authenticate, pass Authorization header in future requests.`
              }]
            };
          }

          // Return real user info from auth context
          const { authInfo } = sessionData;
          return {
            content: [{
              type: "text",
              text: `Authenticated User Info:
    User ID: ${authInfo.userId}
    Client ID: ${authInfo.clientId}
    Session ID: ${sessionId}
    Transport: HTTP Streamable
    Authenticated: ${new Date().toISOString()}`
            }]
          };

        } catch (error) {
          console.error("Error in whoami tool:", error);
          return {
            content: [{ type: "text", text: "Error retrieving user information." }]
          };
        }
      }
    );
  }
  /**
   * Create API client from stored auth info - this replaces the authenticateAndGetClient logic
   */
  private createApiClientFromAuthInfo(authInfo: any): TerapotikApiClient {
    // This should match what your authenticateAndGetClient function does
    // You'll need to import and use your TerapotikApiClient class

    const apiClient = new TerapotikApiClient(authInfo.token);

    return apiClient;
  }
  /**
   * Register the getEventsForToday tool - reusing your existing schema and logic
   */
  private registerGetEventsForTodayTool(server: McpServer): void {
    server.registerTool(
      getEventsForTodayToolInfo.name,
      {
        title: getEventsForTodayToolInfo.name,
        description: getEventsForTodayToolInfo.description,
        inputSchema: getEventsForTodayInputSchema.shape // Reuse your existing schema
      },
      async (params, context) => {
        try {
          // Get session data using session ID from context
          const sessionId = context.sessionId;
          const sessionData = this.sessions.get(sessionId!);

          if (!sessionData?.authInfo) {
            return {
              isError: true,
              content: [{
                type: "text",
                text: `Authentication required. Session ID: ${sessionId} is not authenticated.`
              }]
            };
          }

          // Create API client using the stored auth info
          // This mimics what authenticateAndGetClient does in your SSE version
          const apiClient = this.createApiClientFromAuthInfo(sessionData.authInfo);

          // Get today's date in YYYY-MM-DD format (same logic as SSE)
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;

          // Parse parameters (same as SSE)
          const queryParams = {
            calendarId: params.calendarId,
            maxResults: params.maxResults || 100,
          };

          console.log(`HTTP Streamable: Fetching events for today (${dateStr}) with params:`, queryParams);

          // Fetch events from the API (same call as SSE)
          const events = await apiClient.getEventsForDate(dateStr, queryParams);

          // Format event data as pretty-printed text (same as SSE)
          const formattedEventData = JSON.stringify(events, null, 2);

          // Return formatted response (same format as SSE)
          return {
            content: [
              {
                type: "text",
                text: `Successfully retrieved ${events.items.length} events for today (${dateStr}) via HTTP Streamable transport.`,
              },
              {
                type: "text",
                text: formattedEventData,
              },
            ],
          };

        } catch (error) {
          console.error("Error in HTTP getEventsForToday tool:", error);
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving events for today: ${error instanceof Error ? error.message : "Unknown error"}`,
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

  /**
   * Validate token and get user info - reuses existing auth logic from SSE implementation
   */
  private async validateTokenAndGetUserInfo(token: string): Promise<any | null> {
    try {
      // Method 1: Check against stored client tokens (reuse your existing logic)
      // This matches what you do in authenticated-mcp-server.ts
      const clientMatch = this.findClientByToken(token);
      if (clientMatch) {
        console.log(`Token validated for client: ${clientMatch.clientId}`);

        // Decode JWT to get user info
        const userInfo = this.decodeJwt(token);

        return {
          clientId: clientMatch.clientId,
          userId: userInfo?.sub || 'unknown',
          token: token,
          client: clientMatch.client,
          userClaims: userInfo,
          validatedAt: Date.now()
        };
      }

      // Method 2: Direct JWT validation (fallback)
      // This is useful if you don't have the client stored yet
      const jwtPayload = this.decodeJwt(token);
      if (jwtPayload && this.isValidJwtPayload(jwtPayload)) {
        console.log(`Direct JWT validation successful for user: ${jwtPayload.sub}`);

        return {
          clientId: jwtPayload.sub, // Use sub as fallback client ID
          userId: jwtPayload.sub,
          token: token,
          client: null, // No stored client info
          userClaims: jwtPayload,
          validatedAt: Date.now()
        };
      }

      console.log('Token validation failed');
      return null;

    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  /**
   * Find client by access token - reuses your existing logic
   */
  private findClientByToken(token: string): { clientId: string, client: any } | null {
    // This is exactly what you do in your SSE handleSseConnection method
    for (const [clientId, client] of this.clients.entries()) {
      if (client.tokens && client.tokens.access_token === token) {
        return { clientId, client };
      }
    }
    return null;
  }

  /**
   * Decode JWT token without verification - reuses your existing method
   */
  private decodeJwt(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;

      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  }

  /**
   * Validate JWT payload structure and expiration
   */
  private isValidJwtPayload(payload: any): boolean {
    try {
      // Check required fields
      if (!payload.sub || !payload.aud || !payload.exp) {
        return false;
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.log('JWT token expired');
        return false;
      }

      // Check audience (reuse your logic)
      const validAudiences = ['urn:terapotik-api'];
      if (Array.isArray(payload.aud)) {
        return payload.aud.some((aud: string) => validAudiences.includes(aud));
      } else {
        return validAudiences.includes(payload.aud);
      }

    } catch (error) {
      console.error('Error validating JWT payload:', error);
      return false;
    }
  }

  /**
   * You'll also need access to the clients map from your authenticated server
   * Add this property to your HttpStreamableServer class:
   */
  private clients: Map<string, any> = new Map(); // Add this property

  /**
   * Method to share client data with HTTP transport (call this from unified server)
   */
  public setClientsMap(clients: Map<string, any>): void {
    this.clients = clients;
  }
}