import express, { Express, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import helmet from "helmet";
import morgan from "morgan";

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { AuthenticatedMcpServer } from "./authenticated-mcp-server";
import { UserProfileTool } from "../tools/user-profile-tool";

import { ApiClient } from "../services/api-client";
import { ApiService } from "../services/api-service";

import { config } from "../config";
import path from "path";

/**
 * Express server that hosts the MCP server endpoints
 */
export class McpExpressServer {
    private app: Express;
    private mcpServer: AuthenticatedMcpServer;
    private port: number;
    private baseUrl: string;

    // store transports by session ID // todo: refactor this
    private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

    /**
     * Create a new MCP Express server
     * @param serverName Name of the MCP server
     * @param serverVersion Version of the MCP server
     * @param port Port to listen on
     */
    constructor(serverName: string, serverVersion: string, port: number) {
        this.port = port;
        this.baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

        // Initialize MCP server
        this.mcpServer = new AuthenticatedMcpServer(serverName, serverVersion);

        // Initialize Express app
        this.app = express();
        this.configureMiddleware();
        this.setupRoutes();
    }

    /**
     * Configure Express middleware
     */
    private configureMiddleware(): void {
        // CORS configuration
        this.app.use(
            cors({
                origin: "*",
                methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
                allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "Accept",
                    "Origin",
                    "X-Requested-With",
                ],
                exposedHeaders: ["Location", "Content-Length"],
                credentials: true,
                maxAge: 86400, // 24 hours
            })
        );

        // Request parsing
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.text({ type: "*/*" }));
        this.app.use(bodyParser.urlencoded({ extended: true }));

        this.app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'", "'unsafe-inline'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", "data:", "https://*.auth0.com"],
                        formAction: [
                            "'self'",
                            "http://localhost:3000",
                            "http://localhost:3001",
                            "https://*.auth0.com",
                        ],
                    },
                },
            })
        );
        this.app.use(morgan("dev"));
        //   this.app.use(
        //     cors({
        //       origin: ["http://localhost:3000", "http://localhost:3001"],
        //       credentials: true,
        //     })
        //   );
    }

    /**
     * Set up all Express routes
     */
    private setupRoutes(): void {
        // Home route
        this.app.get("/", (req, res) => {
            res.send(`
              <h1>Auth0 OIDC Consent App</h1>
              <p>Welcome to the Auth0 OIDC Consent Application!</p>
              <p>Use the <a href="/test.html">test page</a> to simulate an OIDC client and test the authorization flow.</p>
            `);
        });
        // SSE endpoint - main connection point for the MCP Inspector
        this.app.get("/sse", (req, res) => {
            this.mcpServer.handleSseConnection(req, res);
        });

        // OPTIONS handler for SSE
        this.app.options("/sse", this.handleCorsOptions);

        // Message endpoint for JSON-RPC communication
        this.app.post("/messages", async (req, res) => {
            await this.mcpServer.handleMessage(req, res);
        });

        // OPTIONS handler for messages
        this.app.options("/messages", this.handleCorsOptions);

        // MCP Configuration Endpoint
        this.app.get("/.well-known/mcp-configuration", (req, res) => {
            this.handleMcpConfigurationRequest(req, res);
        });

        // OPTIONS for MCP configuration
        this.app.options("/.well-known/mcp-configuration", this.handleCorsOptions);

        // OAuth server metadata
        this.app.get("/.well-known/oauth-authorization-server", (req, res) => {
            this.handleOAuthMetadataRequest(req, res);
        });

        // OPTIONS for oauth metadata
        this.app.options(
            "/.well-known/oauth-authorization-server",
            this.handleCorsOptions
        );

        // JWKS endpoint for OAuth token validation
        this.app.get("/.well-known/jwks.json", (req, res) => {
            this.handleJwksRequest(req, res);
        });

        // OPTIONS for JWKS endpoint
        this.app.options("/.well-known/jwks.json", this.handleCorsOptions);

        // Client registration endpoint
        this.app.post("/register", (req, res) => {
            this.handleClientRegistration(req, res);
        });

        // OPTIONS for register
        this.app.options("/register", this.handleCorsOptionsWithLocation);

        // Authorization endpoint
        this.app.get("/authorize", (req, res) => {
            this.handleAuthorization(req, res);
        });

        // Consent confirmation endpoint
        this.app.post("/authorize/consent", (req, res) => {
            this.handleConsentConfirmation(req, res);
        });

        // Token endpoint
        this.app.post("/token", async (req, res) => {
            await this.handleTokenRequest(req, res);
        });

        // OPTIONS for token
        this.app.options("/token", this.handleCorsOptions);

        // Callback endpoint to handle Auth0 response
        this.app.get("/callback", async (req, res) => {
            await this.handleAuthCallback(req, res);
        });

        // Serve static files from the public directory
        this.app.use(express.static(path.join(__dirname, "../../public")));

        // Set up views for the consent page
        this.app.set("view engine", "ejs");
        this.app.set("views", "./src/views");
    }

    private setupHttpStreamableEndpoint(): void {

        // initialize services
        const apiClient = new ApiClient(config.api);
        const apiService = new ApiService(apiClient);
        const userProfileTool = new UserProfileTool(apiService);

        // MCP endpoint using Streamable HTTP
        this.app.post('/mcp', async (req, res) => {
            // Check for existing session ID
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            let transport: StreamableHTTPServerTransport;

            if (sessionId && this.transports[sessionId]) {
                // Reuse existing transport
                transport = this.transports[sessionId];
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId) => {
                        // Store the transport by session ID
                        this.transports[sessionId] = transport;
                    },
                });

                // Clean up transport when closed
                transport.onclose = () => {
                    if (transport.sessionId) {
                        delete this.transports[transport.sessionId];
                    }
                };

                // Create MCP server for this session
                const server = new McpServer({
                    name: config.server.name,
                    version: config.server.version,
                });

                // Register tools
                userProfileTool.register(server);

                // Connect to the MCP server
                await server.connect(transport);
            } else {
                // Invalid request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return;
            }

            // Handle the request
            await transport.handleRequest(req, res, req.body);
        });
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
     * Handle OPTIONS requests with Location header exposed
     */
    private handleCorsOptionsWithLocation = (
        req: Request,
        res: Response
    ): void => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Access-Control-Expose-Headers", "Location");
        res.status(204).end();
    };


    /**
     * Handle MCP configuration requests
     */
    private handleMcpConfigurationRequest(req: Request, res: Response): void {
        console.log(
            "MCP configuration requested from:",
            req.headers.origin || "unknown"
        );

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Content-Type", "application/json; charset=utf-8");
        res.header("Cache-Control", "no-store");
        res.header("Pragma", "no-cache");

        res.json(this.mcpServer.getMcpConfiguration(this.baseUrl));
    }

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
        res.json(this.mcpServer.getOAuthServerMetadata(this.baseUrl));
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

    /**
     * Handle client registration
     */
    private handleClientRegistration(req: Request, res: Response): void {
        try {
            const clientData = req.body;
            console.log("Client registration request:", clientData);

            const registeredClient = this.mcpServer.registerClient(clientData);
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
        let client = this.mcpServer.getClient(client_id as string);

        if (!client) {
            console.log(`Registering client on authorization: ${client_id}`);
            const clientData = {
                client_id,
                client_id_issued_at: Math.floor(Date.now() / 1000),
                redirect_uris: [redirect_uri as string],
                token_endpoint_auth_method: "none",
            };

            client = clientData;
            this.mcpServer.setClient(client_id as string, client);
        }

        // Store pending request info for later
        client.pending_request = {
            client_id,
            redirect_uri,
            code_challenge,
            code_challenge_method,
            state,
        };

        this.mcpServer.setClient(client_id as string, client);

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
            `${process.env.BASE_URL || this.baseUrl}/callback`
        );
        auth0Url.searchParams.set("scope", "openid profile email");

        // Add audience parameter to ensure we get a proper access token, not a client credentials token
        const auth0Audience =
            process.env.AUTH0_AUDIENCE || "https://api.terapotik.com";
        auth0Url.searchParams.set("audience", auth0Audience);

        // Store the MCP client ID in state so we can retrieve it in the callback
        const enrichedState = `mcp_client_id=${client_id}&mcp_redirect_uri=${encodeURIComponent(
            redirect_uri as string
        )}&original_state=${state || ""}`;
        auth0Url.searchParams.set("state", enrichedState);

        console.log("Enriched state:", enrichedState);

        // DO NOT pass along PKCE parameters - Auth0 will require code_verifier later
        // but we don't have access to the original code_verifier from MCP Inspector
        // Instead, we'll handle our own PKCE between MCP Inspector and our server

        const finalUrl = auth0Url.toString();
        console.log(`Redirecting to Auth0: ${finalUrl}`);
        res.redirect(finalUrl);
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
        const client = this.mcpServer.getClient(client_id);
        client.authorization_code = {
            code,
            redirect_uri,
            code_challenge,
            code_challenge_method,
            expires_at: Date.now() + 600000, // 10 minutes
        };

        this.mcpServer.setClient(client_id, client);

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
            const foundClient = this.mcpServer.findClientByAuthCode(code);
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

                // Print full tokens object for debugging (omit sensitive parts)
                console.log("Token data being returned:", {
                    access_token_partial: client.tokens.access_token
                        ? client.tokens.access_token.substring(0, 10) + "..."
                        : undefined,
                    token_type: client.tokens.token_type,
                    expires_in: client.tokens.expires_in,
                    has_refresh_token: !!client.tokens.refresh_token,
                    has_id_token: !!client.tokens.id_token,
                });

                // Debug token format before returning
                try {
                    const tokenParts = client.tokens.access_token.split(".");
                    console.log(
                        `Token has ${tokenParts.length} parts, expected 3 for standard JWT`
                    );

                    if (tokenParts.length >= 1) {
                        const headerBase64 = tokenParts[0];
                        const headerJson = Buffer.from(headerBase64, "base64").toString(
                            "utf8"
                        );
                        console.log(`Token header: ${headerJson}`);
                    }
                } catch (error) {
                    console.error("Error analyzing token format:", error);
                }

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
                    this.mcpServer.setClient(clientId as string, client);

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
            const mcpClient = this.mcpServer.getClient(mcpClientId as string);

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

            const callbackUrl = `${this.baseUrl}/callback`;
            console.log("Exchange Auth0 code using redirect_uri:", callbackUrl);

            try {
                // Log full request details
                const tokenRequest = {
                    grant_type: "authorization_code",
                    client_id: auth0ClientId,
                    client_secret: auth0ClientSecret,
                    code: code,
                    redirect_uri: callbackUrl,
                };

                console.log(
                    "Auth0 token request:",
                    JSON.stringify(tokenRequest, null, 2)
                );

                if (!auth0ClientSecret) {
                    console.warn(
                        "WARNING: AUTH0_CLIENT_SECRET is not set in environment variables"
                    );
                }

                // Make a request to Auth0's token endpoint
                const tokenResponse = await fetch(
                    `https://${auth0Domain}/oauth/token`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(tokenRequest),
                    }
                );

                // Log response status
                console.log("Auth0 token response status:", tokenResponse.status);
                console.log(
                    "Auth0 token response headers:",
                    JSON.stringify(
                        Object.fromEntries([...tokenResponse.headers.entries()]),
                        null,
                        2
                    )
                );

                if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text();
                    console.error("Auth0 token exchange error:", errorText);
                    try {
                        // Try to parse error as JSON for better debugging
                        const errorJson = JSON.parse(errorText);
                        console.error(
                            "Auth0 error details:",
                            JSON.stringify(errorJson, null, 2)
                        );
                    } catch (e) {
                        // If not JSON, just log the raw text
                    }
                    res
                        .status(400)
                        .send(`Error exchanging code for tokens: ${errorText}`);
                    return;
                }

                const tokenData = (await tokenResponse.json()) as {
                    access_token: string;
                    token_type: string;
                    expires_in: number;
                    refresh_token?: string;
                    id_token?: string;
                };

                console.log("Received tokens from Auth0:", {
                    access_token: tokenData.access_token
                        ? `${tokenData.access_token.substring(0, 10)}...`
                        : undefined,
                    token_type: tokenData.token_type,
                    expires_in: tokenData.expires_in,
                    refresh_token: tokenData.refresh_token ? "present" : "missing",
                });

                // Decode and log the token to verify it has the right sub claim
                try {
                    if (tokenData.access_token) {
                        const parts = tokenData.access_token.split(".");
                        if (parts.length === 3) {
                            const payload = Buffer.from(parts[1], "base64").toString("utf8");
                            const decoded = JSON.parse(payload);
                            console.log("Decoded access token:", {
                                sub: decoded.sub,
                                aud: decoded.aud,
                                // Only log important fields
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error decoding access token:", error);
                }

                // Store the tokens with the MCP client
                mcpClient.tokens = tokenData;
                this.mcpServer.setClient(mcpClientId as string, mcpClient);

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

                this.mcpServer.setClient(mcpClientId as string, mcpClient);

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
     * Start the server
     */
    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`MCP server with auth running on port ${this.port}`);
            console.log(`BASE_URL: ${this.baseUrl}`);
            console.log(
                `MCP configuration: ${this.baseUrl}/.well-known/mcp-configuration`
            );
            console.log(
                `OAuth metadata: ${this.baseUrl}/.well-known/oauth-authorization-server`
            );
        });
    }


}