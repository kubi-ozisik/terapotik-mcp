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
  private baseUrl: string;

  constructor(serverName: string, serverVersion: string, port: number) {
    this.serverName = serverName;
    this.serverVersion = serverVersion;
    this.port = port;

    this.baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

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
    this.app.use(express.urlencoded({ extended: true }));
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
      this.handleOAuthMetadataRequest(req, res);
    });

    // OPTIONS for oauth metadata
    this.app.options('/.well-known/oauth-authorization-server', this.handleCorsOptions);

    // Client registration endpoint
    this.app.post('/register', (req, res) => {
      this.handleClientRegistration(req, res);
    });

    // OPTIONS for register
    this.app.options('/register', this.handleCorsOptions);

    // Authorization endpoint
    this.app.get('/authorize', (req, res) => {
      this.handleAuthorization(req, res);
    });

    // OPTIONS for authorize
    this.app.options('/authorize', this.handleCorsOptions);

    // callback endpoint
    this.app.get('/callback', (req, res) => {
      this.handleAuthCallback(req, res);
    });

    // OPTIONS for callback
    this.app.options('/callback', this.handleCorsOptions);

    // token endpoint
    this.app.post('/token', (req, res) => {
      this.handleTokenRequest(req, res);
    });

    // OPTIONS for token
    this.app.options('/token', this.handleCorsOptions);

    // consent confirmation endpoint
    this.app.post('/authorize/consent', (req, res) => {
      this.handleConsentConfirmation(req, res);
    });

    // OPTIONS for consent confirmation
    this.app.options('/authorize/consent', this.handleCorsOptions);

    // JWKS endpoint for OAuth token validation
    this.app.get("/.well-known/jwks.json", (req, res) => {
      this.handleJwksRequest(req, res);
    });

    // OPTIONS for JWKS endpoint
    this.app.options("/.well-known/jwks.json", this.handleCorsOptions);
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

      if (!sessionId && isInitializeRequest(req.body) && !authInfo) {
        // new initialization request without authentication
        // set WWW-Authenticated header to trigger OAuth flow for MCP inspector
        res.setHeader("WWW-Authenticate", "Bearer");
        res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Authentication required. Please authenticate via OAuth flow.',
          },
          id: (req.body as any)?.id || null,
        });
        return;
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

  // OAUTH ENDPOINTS
  /**
   * Handle OAuth metadata requests
   */
  private handleOAuthMetadataRequest(req: Request, res: Response): void {
    console.log(
      "OAuth metadata requested from:",
      req.headers.origin || "unknown"
    );

    // Ensure CORS headers are properly set
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Content-Type", "application/json; charset=utf-8");
    res.header("Cache-Control", "no-store");
    res.header("Pragma", "no-cache");

    // Point to our server's endpoints instead of directly to Auth0
    res.json(this.getOAuthServerMetadata(this.baseUrl));  
  }

  /**
  * Get OAuth server metadata
  */
  private getOAuthServerMetadata(baseUrl: string): any {
    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      registration_endpoint: `${baseUrl}/register`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["openid", "profile", "email"],
    };
  }

  /**
   * Handle OPTIONS requests with standard CORS headers
   */
  private handleCorsOptions = (req: Request, res: Response): void => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).end();
  };

  /**
   * Handle client registration
   */
  private handleClientRegistration(req: Request, res: Response): void {
    try {
      const clientData = req.body;
      console.log("Client registration request:", clientData);

      const registeredClient = this.registerClient(clientData);
      res.status(201).json(registeredClient);
    } catch (error) {
      console.error("Client registration error:", error);
      res.status(400).json({
        error: "invalid_client_metadata",
        error_description: "Invalid client metadata",
      });
    }
  }

  /**
   * Register a new OAuth client
   */
  private registerClient(clientData: any): any {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const client = {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientData.client_name || 'MCP Client',
      redirect_uris: clientData.redirect_uris || [],
      token_endpoint_auth_method: clientData.token_endpoint_auth_method || 'none',
      grant_types: clientData.grant_types || ['authorization_code'],
      response_types: clientData.response_types || ['code'],
      ...clientData
    };

    // Store the client
    this.clients.set(clientId, client);

    return client;
  }

  /**
   * Handle authorization requests
   */
  private handleAuthorization(req: Request, res: Response): void {
    console.log("Authorization request received:", req.query);

    const {
      response_type,
      client_id,
      code_challenge,
      code_challenge_method,
      redirect_uri,
      state,
    } = req.query;

    if (!client_id || !redirect_uri) {
      console.error("Missing required parameters:", {
        client_id,
        redirect_uri,
      });
      res.status(400).send("Missing required parameters");
      return;
    }

    // Store or update client
    let client = this.getClient(client_id as string);

    if (!client) {
      console.log(`Registering client on authorization: ${client_id}`);
      const clientData = {
        client_id,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        redirect_uris: [redirect_uri as string],
        token_endpoint_auth_method: "none",
      };

      client = clientData;
      this.setClient(client_id as string, client);
    }

    // Store pending request info for later
    client.pending_request = {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    };

    this.setClient(client_id as string, client);

    // Build Auth0 authorization URL
    const auth0Domain = process.env.AUTH0_DOMAIN || "smeetapp.eu.auth0.com";
    const auth0ClientId =
      process.env.AUTH0_CLIENT_ID || "S7ienbLLZy9wBFPjgqKHCsQoXBSaqjhv";

    console.log("Using Auth0 config:", { auth0Domain, auth0ClientId });

    const auth0Url = new URL(`https://${auth0Domain}/authorize`);
    auth0Url.searchParams.set("client_id", auth0ClientId);
    auth0Url.searchParams.set("response_type", "code");
    auth0Url.searchParams.set(
      "redirect_uri",
      `${process.env.BASE_URL || `http://localhost:${this.port}`}/callback`
    );
    auth0Url.searchParams.set("scope", "openid profile email");

    // Add audience parameter to ensure we get a proper access token
    const auth0Audience =
      process.env.AUTH0_AUDIENCE || "https://api.terapotik.com";
    auth0Url.searchParams.set("audience", auth0Audience);

    // Store the MCP client ID in state so we can retrieve it in the callback
    const enrichedState = `mcp_client_id=${client_id}&mcp_redirect_uri=${encodeURIComponent(
      redirect_uri as string
    )}&original_state=${state || ""}`;
    auth0Url.searchParams.set("state", enrichedState);

    console.log("Enriched state:", enrichedState);

    const finalUrl = auth0Url.toString();
    console.log(`Redirecting to Auth0: ${finalUrl}`);
    res.redirect(finalUrl);
  }

  /**
   * Get client by ID
   */
  private getClient(clientId: string): any {
    return this.clients.get(clientId);
  }

  /**
   * Set client by ID
   */
  private setClient(clientId: string, client: any): void {
    this.clients.set(clientId, client);
  }

  /**
 * Handle Auth0 callback
 */
  private async handleAuthCallback(req: Request, res: Response): Promise<void> {
    console.log("Auth0 callback received with query params:", req.query);

    const { code, state, error } = req.query;

    if (error) {
      console.error("Auth0 returned an error:", error);
      res.status(400).send(`Auth0 error: ${error}`);
      return;
    }

    if (!code || !state) {
      console.error("Missing code or state:", { code, state });
      res.status(400).send("Missing code or state");
      return;
    }

    try {
      // Parse the state to get the MCP client ID, redirect_uri and original state
      const stateString = state as string;
      const mcpClientIdMatch = stateString.match(/mcp_client_id=([^&]+)/);
      const mcpRedirectUriMatch = stateString.match(/mcp_redirect_uri=([^&]+)/);
      const originalStateMatch = stateString.match(/original_state=([^&]*)/);

      const mcpClientId = mcpClientIdMatch ? mcpClientIdMatch[1] : null;
      const mcpRedirectUri = mcpRedirectUriMatch
        ? decodeURIComponent(mcpRedirectUriMatch[1])
        : null;
      const originalState = originalStateMatch ? originalStateMatch[1] : "";

      console.log("Parsed state parameters:", {
        mcpClientId,
        mcpRedirectUri,
        originalState,
      });

      if (!mcpClientId) {
        console.error("Invalid state - missing MCP client ID");
        res.status(400).send("Invalid state - missing MCP client ID");
        return;
      }

      // Get the MCP client
      const mcpClient = this.getClient(mcpClientId as string);

      if (!mcpClient) {
        console.error("Invalid MCP client:", mcpClientId);
        res.status(400).send("Invalid MCP client");
        return;
      }

      // Exchange the Auth0 code for tokens
      const auth0Domain = process.env.AUTH0_DOMAIN || "smeetapp.eu.auth0.com";
      const auth0ClientId =
        process.env.AUTH0_CLIENT_ID || "S7ienbLLZy9wBFPjgqKHCsQoXBSaqjhv";
      const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

      const callbackUrl = `${this.baseUrl || `http://localhost:${this.port}`}/callback`;
      console.log("Exchange Auth0 code using redirect_uri:", callbackUrl);

      try {
        // Make a request to Auth0's token endpoint
        const tokenResponse = await fetch(
          `https://${auth0Domain}/oauth/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              grant_type: "authorization_code",
              client_id: auth0ClientId,
              client_secret: auth0ClientSecret,
              code: code,
              redirect_uri: callbackUrl,
            }),
          }
        );

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("Auth0 token exchange error:", errorText);
          res.status(400).send(`Error exchanging code for tokens: ${errorText}`);
          return;
        }

        const tokenData = (await tokenResponse.json()) as {
          access_token: string;
          token_type: string;
          expires_in: number;
          refresh_token?: string;
          id_token?: string;
        };

        console.log("Received tokens from Auth0");

        // Store the tokens with the MCP client
        mcpClient.tokens = tokenData;
        this.setClient(mcpClientId as string, mcpClient);

        // Get the redirect URI from the stored state or pending request
        let redirectUri = mcpRedirectUri;
        if (
          !redirectUri &&
          mcpClient.pending_request &&
          mcpClient.pending_request.redirect_uri
        ) {
          redirectUri = mcpClient.pending_request.redirect_uri;
        }

        if (!redirectUri) {
          console.error("Missing redirect URI");
          res.status(400).send("Missing redirect URI");
          return;
        }

        // Generate an MCP authorization code
        const mcpCode = `auth_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 15)}`;
        console.log("Generated MCP code:", mcpCode);

        // Store the code with the client
        mcpClient.authorization_code = {
          code: mcpCode,
          redirect_uri: redirectUri,
          code_challenge: mcpClient.pending_request?.code_challenge,
          code_challenge_method:
            mcpClient.pending_request?.code_challenge_method,
          expires_at: Date.now() + 600000, // 10 minutes
        };

        this.setClient(mcpClientId as string, mcpClient);

        // Build the redirect URL for the MCP client
        const redirectUrl = new URL(redirectUri as string);
        redirectUrl.searchParams.set("code", mcpCode);

        if (originalState) {
          redirectUrl.searchParams.set("state", originalState);
        }

        const finalRedirectUrl = redirectUrl.toString();
        console.log(`Redirecting to MCP client: ${finalRedirectUrl}`);
        res.redirect(finalRedirectUrl);
      } catch (error) {
        console.error("Auth0 token exchange error:", error);
        res.status(500).send("Error exchanging code for tokens");
      }
    } catch (error) {
      console.error("Error in callback:", error);
      res.status(500).send("Error processing Auth0 callback");
    }
  }


  /**
 * Handle token requests
 */
  private async handleTokenRequest(req: Request, res: Response): Promise<void> {
    console.log("Token request received with body:", req.body);

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    try {
      // Parse form data correctly based on content type
      let formData: any;
      if (typeof req.body === "string") {
        // Handle URL-encoded form data
        formData = Object.fromEntries(new URLSearchParams(req.body).entries());
        console.log("Parsed form data from string:", formData);
      } else {
        // Body is already parsed as an object
        formData = req.body;
      }

      const grant_type = formData.grant_type;
      const code = formData.code;
      const client_id = formData.client_id;
      const redirect_uri = formData.redirect_uri;
      const code_verifier = formData.code_verifier;

      console.log("Token request parameters:", {
        grant_type,
        code: code ? `${code.substring(0, 10)}...` : undefined,
        client_id,
        redirect_uri,
        code_verifier: code_verifier ? "present" : "missing",
      });

      // Find client using authorization code as the primary identifier
      let client = null;
      let clientId = null;

      if (!code) {
        console.error("Missing authorization code in token request");
        res.status(400).json({
          error: "invalid_request",
          error_description: "Authorization code is required",
        });
        return;
      }

      console.log(`Looking for client by code: ${code.substring(0, 20)}...`);

      // Find client by authorization code
      const foundClient = this.findClientByAuthCode(code);
      if (foundClient) {
        client = foundClient.client;
        clientId = foundClient.clientId;
        console.log(`Found client ${clientId} by authorization code`);
      }

      if (!client) {
        console.error("Client not found for the provided authorization code");
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        });
        return;
      }

      if (grant_type === "authorization_code") {
        // Validate the authorization code
        if (
          !client.authorization_code ||
          client.authorization_code.code !== code
        ) {
          console.error("Invalid authorization code", {
            expected: client.authorization_code?.code,
            received: code,
          });
          res.status(400).json({
            error: "invalid_grant",
            error_description: "Invalid authorization code",
          });
          return;
        }

        // Check if the code has expired
        if (client.authorization_code.expires_at < Date.now()) {
          console.error("Authorization code expired", {
            expiresAt: new Date(client.authorization_code.expires_at),
            now: new Date(),
          });
          res.status(400).json({
            error: "invalid_grant",
            error_description: "Authorization code expired",
          });
          return;
        }

        // Return the Auth0 tokens that we already have stored
        if (!client.tokens) {
          console.error("No tokens found for client");
          res.status(500).json({
            error: "server_error",
            error_description: "No tokens found for client",
          });
          return;
        }

        console.log("Returning Auth0 tokens to client");

        // Return the tokens - these are from Auth0
        res.json({
          access_token: client.tokens.access_token,
          token_type: client.tokens.token_type || "Bearer",
          expires_in: client.tokens.expires_in || 3600,
          refresh_token: client.tokens.refresh_token,
          id_token: client.tokens.id_token,
        });
        return;
      } else if (grant_type === "refresh_token") {
        const refresh_token = formData.refresh_token;

        if (!refresh_token) {
          console.error("Missing refresh_token");
          res.status(400).json({
            error: "invalid_request",
            error_description: "Missing refresh_token",
          });
          return;
        }

        try {
          // Exchange the refresh token with Auth0
          const auth0Domain =
            process.env.AUTH0_DOMAIN || "smeetapp.eu.auth0.com";
          const auth0ClientId =
            process.env.AUTH0_CLIENT_ID || "S7ienbLLZy9wBFPjgqKHCsQoXBSaqjhv";
          const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

          console.log("Refreshing token with Auth0...");

          const tokenResponse = await fetch(
            `https://${auth0Domain}/oauth/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: auth0ClientId,
                client_secret: auth0ClientSecret,
                refresh_token: refresh_token,
              }),
            }
          );

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Auth0 refresh token error:", errorText);
            res.status(400).json({
              error: "invalid_grant",
              error_description: "Error refreshing token",
            });
            return;
          }

          const refreshedTokenData = (await tokenResponse.json()) as {
            access_token: string;
            token_type: string;
            expires_in: number;
            refresh_token: string;
            id_token: string;
          };
          console.log("Received refreshed tokens from Auth0");

          // Store the new tokens with the client
          client.tokens = refreshedTokenData;
          this.setClient(clientId as string, client);

          // Return the new tokens from Auth0
          res.json({
            access_token: refreshedTokenData.access_token,
            token_type: refreshedTokenData.token_type || "Bearer",
            expires_in: refreshedTokenData.expires_in || 3600,
            refresh_token: refreshedTokenData.refresh_token,
            id_token: refreshedTokenData.id_token,
          });
          return;
        } catch (error) {
          console.error("Error refreshing token with Auth0:", error);
          res.status(400).json({
            error: "invalid_grant",
            error_description: "Error refreshing token",
          });
          return;
        }
      } else {
        console.error(`Unsupported grant type: ${grant_type}`);
        res.status(400).json({
          error: "unsupported_grant_type",
          error_description: "Unsupported grant type",
        });
        return;
      }
    } catch (error) {
      console.error("Token endpoint error:", error);
      res.status(500).json({
        error: "server_error",
        error_description: "Internal server error",
      });
    }
  }

  /**
   * Find client by authorization code
   */
  private findClientByAuthCode(code: string): { client: any; clientId: string } | null {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.authorization_code && client.authorization_code.code === code) {
        return { client, clientId };
      }
    }
    return null;
  }


  /**
 * Handle consent confirmation
 */
  private handleConsentConfirmation(req: Request, res: Response): void {
    console.log("Consent response received:", req.body);

    const {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      consent,
    } = req.body;

    if (consent !== "approve") {
      // User denied the authorization
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set("error", "access_denied");
      redirectUrl.searchParams.set(
        "error_description",
        "The user denied the authorization request"
      );

      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      res.redirect(redirectUrl.toString());
      return;
    }

    // User approved, generate authorization code
    const code = `auth_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    // Store code with client
    const client = this.getClient(client_id);
    client.authorization_code = {
      code,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      expires_at: Date.now() + 600000, // 10 minutes
    };

    this.setClient(client_id, client);

    // Redirect with code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);

    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    console.log(`Redirecting to: ${redirectUrl.toString()}`);
    res.redirect(redirectUrl.toString());
  }

  /**
 * Handle JWKS requests - this redirects to Auth0's JWKS endpoint
 */
  private handleJwksRequest(req: Request, res: Response): void {
    console.log("JWKS requested from:", req.headers.origin || "unknown");

    // Ensure CORS headers are properly set
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Content-Type", "application/json; charset=utf-8");
    res.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

    // Get Auth0 domain
    const auth0Domain = process.env.AUTH0_DOMAIN || "smeetapp.eu.auth0.com";

    // Redirect to Auth0 JWKS endpoint
    const auth0JwksUrl = `https://${auth0Domain}/.well-known/jwks.json`;

    // Proxy the request to Auth0's JWKS endpoint
    fetch(auth0JwksUrl)
      .then((response) => response.json())
      .then((jwks) => {
        console.log("Successfully retrieved JWKS from Auth0");
        res.json(jwks);
      })
      .catch((error) => {
        console.error("Error fetching JWKS from Auth0:", error);
        res.status(500).json({
          error: "server_error",
          error_description: "Error fetching JWKS",
        });
      });
  }

}