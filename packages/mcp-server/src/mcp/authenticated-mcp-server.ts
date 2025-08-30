import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpToolHandler } from "../types/mcp";
import {
    createGetCalendarListHandler,
    createGetEventsForDateHandler,
    createGetEventsForDateRangeHandler,
    getCalendarEventsInputSchema,
    getCalendarEventsToolInfo,
    getCalendarListInputSchema,
    getCalendarListToolInfo,
    getEventsForDateInputSchema,
    getEventsForDateRangeInputSchema,
    getEventsForDateRangeToolInfo,
    getEventsForDateToolInfo
} from "../tools/calendar/get-calendar-events";
import {
    createGetCalendarEventsHandler,
    createGetEventsForTodayHandler,
    getEventsForTodayInputSchema, getEventsForTodayToolInfo
} from "../tools/calendar";
import {
    createCalendarEventInputSchema,
    createCalendarEventToolInfo,
    createCreateCalendarEventHandler,
    createCreateRecurringEventHandler,
    createRecurringEventInputSchema,
    createRecurringEventToolInfo
} from "../tools/calendar/create-calendar-event";
import {
    createGetTaskListsHandler,
    createGetTasksForListHandler,
    createGetTasksHandler,
    createTaskListInputSchema,
    getTaskListsInputSchema,
    getTaskListsToolInfo,
    getTasksForListInputSchema,
    getTasksForListToolInfo,
    getTasksInputSchema,
    getTasksToolInfo
} from "../tools/tasks/get-google-tasks";
import { 
    createCreateTaskHandler, 
    createCreateTaskListHandler, 
    createDeleteTaskHandler,
    createTaskInputSchema,
    createTaskListToolInfo,
    createTaskToolInfo,
    createUpdateTaskHandler,
    deleteTaskInputSchema,
    deleteTaskToolInfo,
    updateTaskInputSchema,
    updateTaskToolInfo,
} from "../tools/tasks/upsert-google-tasks";
import zodToJsonSchema from "zod-to-json-schema";


export class AuthenticatedMcpServer {
    // Server name and version for configuration
    private serverName: string;
    private serverVersion: string;

    // The MCP server instance
    private server: McpServer;

    // Client registry
    private clients: Map<string, any>;

    // Session authentication map - connects sessionIds to client auth info
    private sessionAuth: Map<string, any>;

    // Store active connections
    private activeConnections: Map<
        string,
        {
            transport: SSEServerTransport;
            response: Response;
            authInfo: any;
        }
    >;

    /**
     * Create a new AuthenticatedMcpServer
     * @param name The name of the server
     * @param version The version of the server
     */
    constructor(name: string, version: string) {
        this.server = new McpServer({
            name,
            version,
        });
        this.serverName = name;
        this.serverVersion = version;

        this.activeConnections = new Map();
        this.clients = new Map();
        this.sessionAuth = new Map();

        // Register built-in tools
        this.registerTools();
    }

    /**
     * Register a custom tool
     * @param name Tool name
     * @param description Tool description
     * @param schema Tool schema
     * @param handler Tool handler function
     */
    public registerTool(
        name: string,
        description: string,
        schema: any,
        handler: McpToolHandler
    ): void {
        this.server.tool(name, description, schema, handler);
    }

    private registerCalendarTools(): void {
        // get calendar list tool
        this.server.tool(
            getCalendarListToolInfo.name,
            getCalendarListToolInfo.description,
            getCalendarListInputSchema.shape,
            createGetCalendarListHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // get calendar events tool
        this.server.tool(
            getCalendarEventsToolInfo.name,
            getCalendarEventsToolInfo.description,
            getCalendarEventsInputSchema.shape,
            createGetCalendarEventsHandler(
                (sessionId) => {
                    // use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // return the auth info 
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        this.server.registerTool(
            getEventsForTodayToolInfo.name,
            {
                title: getEventsForTodayToolInfo.name,
                description: getEventsForTodayToolInfo.description,
                inputSchema: getEventsForTodayInputSchema.shape 
            },
            createGetEventsForTodayHandler(
                (sessionId) => {
                    this.getTokenInfoForSession(sessionId);
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        )

        // Add Get Events For Date tool
        this.server.tool(
            getEventsForDateToolInfo.name,
            getEventsForDateToolInfo.description,
            getEventsForDateInputSchema.shape,
            createGetEventsForDateHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // Add Get Events For Date Range tool
        this.server.tool(
            getEventsForDateRangeToolInfo.name,
            getEventsForDateRangeToolInfo.description,
            getEventsForDateRangeInputSchema.shape,
            createGetEventsForDateRangeHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // create calendar event tool
        this.server.tool(
            createCalendarEventToolInfo.name,
            createCalendarEventToolInfo.description,
            createCalendarEventInputSchema.shape,
            createCreateCalendarEventHandler(
                (sessionId) => {
                    this.getTokenInfoForSession(sessionId);
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // Add Create Recurring Event tool
        this.server.tool(
            createRecurringEventToolInfo.name,
            createRecurringEventToolInfo.description,
            createRecurringEventInputSchema.shape,
            createCreateRecurringEventHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );
    }

    private registerGoogleTaskTools(): void {
        // google tasks tool
        this.server.registerTool(
            getTasksToolInfo.name,
            {
                title: getTasksToolInfo.name,
                description: getTasksToolInfo.description,
                inputSchema: getTasksInputSchema.shape 
            },
            createGetTasksHandler(
                (sessionId) => {
                    this.getTokenInfoForSession(sessionId);
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // get task lists tool
        this.server.tool(
            getTaskListsToolInfo.name,
            getTaskListsToolInfo.description,
            getTaskListsInputSchema.shape,
            createGetTaskListsHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // get tasks for list tool
        this.server.tool(
            getTasksForListToolInfo.name,
            getTasksForListToolInfo.description,
            getTasksForListInputSchema.shape,
            createGetTasksForListHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // get task list tool
        this.server.registerTool(
            createTaskListToolInfo.name,
            {
                title: createTaskListToolInfo.name,
                description: createTaskListToolInfo.description,
                inputSchema: createTaskListInputSchema.shape
            },
            createCreateTaskListHandler(
                (sessionId) => {
                    this.getTokenInfoForSession(sessionId);
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // Add Create Task tool
        this.server.tool(
            createTaskToolInfo.name,
            createTaskToolInfo.description,
            createTaskInputSchema.shape,
            createCreateTaskHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // Add Update Task tool
        this.server.tool(
            updateTaskToolInfo.name,
            updateTaskToolInfo.description,
            updateTaskInputSchema.shape,
            createUpdateTaskHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );

        // Add Delete Task tool
        this.server.tool(
            deleteTaskToolInfo.name,
            deleteTaskToolInfo.description,
            deleteTaskInputSchema.shape,
            createDeleteTaskHandler(
                (sessionId) => {
                    // Use the helper method to get token info with logging
                    this.getTokenInfoForSession(sessionId);
                    // Return the auth info as before
                    return this.sessionAuth.get(sessionId);
                },
                (clientId) => this.clients.get(clientId)
            )
        );
    }

    private registerTools(): void {
        // to check auth
        this.server.tool(
            "whoami",
            "Get information about the current authenticated user",
            {},
            this.createWhoAmIHandler()
        );

        this.registerCalendarTools();
        console.log("registering google task tools");
        this.registerGoogleTaskTools();
    }

    /**
     * Create the handler for the whoami tool
    */
    private createWhoAmIHandler(): McpToolHandler {
        // using arrow function to preserve 'this' context
        return async (params, context) => {
            try {
                // get session id from context
                const { sessionId } = context;

                if (!sessionId) {
                    console.log("No session ID found in context");
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No session ID found in context"
                            }
                        ]
                    }
                }

                const authInfo = this.sessionAuth.get(sessionId);

                if (!authInfo) {
                    console.log(`No auth info found for session ID ${sessionId}`);
                    return {
                        content: [
                            {
                                type: "text",
                                text: "You are not authenticated.",
                            },
                        ],
                    };
                }

                // Get the client from the clients map
                const client = this.clients.get(authInfo.clientId);
                // Get token data and decode claims
                const tokenInfo = client?.tokens || {};
                // Extract and decode claims from tokens
                const claims = {
                    access_token: tokenInfo.access_token
                        ? this.decodeJwt(tokenInfo.access_token)
                        : null,
                    id_token: tokenInfo.id_token
                        ? this.decodeJwt(tokenInfo.id_token)
                        : null,
                };
                const userInfo = claims.id_token || claims.access_token || {};
                return {
                    content: [
                        {
                            type: "text",
                            text: `
        You are authenticated as client: ${authInfo.clientId}
        User Info:
        ${JSON.stringify(userInfo, null, 2)}
      
        Full Claims:
        ${JSON.stringify(claims, null, 2)}`,
                        },
                    ],
                };
            } catch (error) {
                console.error("Error in whoami tool:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error retrieving authentication information.",
                        },
                    ],
                };
            }
        };
    }

    /**
     * Decode JWT token without verification
     * @param token The JWT token
     * @returns Decoded payload or null if invalid
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
     * Get MCP configuration data
     * @param baseUrl The base URL of the server
     * @returns MCP configuration object
     */
    public getMcpConfiguration(baseUrl: string): any {
        return {
            name: this.serverName,
            version: this.serverVersion,
            sse_endpoint: `${baseUrl}/sse`,
            message_endpoint: `${baseUrl}/messages`,
            oauth: {
                authorization_endpoint: `${baseUrl}/authorize`,
                token_endpoint: `${baseUrl}/token`,
                registration_endpoint: `${baseUrl}/register`,
                issuer: baseUrl,
            },
            tools: this.getToolsConfiguration(),
        };
    }

    /**
     * Get tools configuration
     * @returns Array of tool configurations
     */
    private getToolsConfiguration(): any[] {
        const serverAny = this.server as any;
        if (!serverAny.tools) return [];

        return Object.keys(serverAny.tools).map((name) => {
            const tool = serverAny.tools[name];
            return {
                name,
                description: tool.description,
                input_schema: tool.inputSchema,
            };
        });
    }

    /**
     * Get OAuth server metadata
     * @param baseUrl The base URL of the server
     * @returns OAuth server metadata
     */
    public getOAuthServerMetadata(baseUrl: string): any {
        return {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/authorize`,
            token_endpoint: `${baseUrl}/token`,
            registration_endpoint: `${baseUrl}/register`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            token_endpoint_auth_methods_supported: ["none"],
            scopes_supported: ["openid", "profile", "email", "offline_access"],
            code_challenge_methods_supported: ["S256"],
            id_token_signing_alg_values_supported: ["RS256"],
            token_endpoint_auth_signing_alg_values_supported: ["RS256"],
            access_token_signing_alg_values_supported: ["RS256"],
        };
    }

    /**
     * Register a new client
     * @param clientData Client registration data
     * @returns The registered client data with client ID
     */
    public registerClient(clientData: any): any {
        // Generate client ID
        const clientId = Math.random().toString(36).substring(2, 15);

        // Create client record
        const registeredClient = {
            ...clientData,
            client_id: clientId,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            token_endpoint_auth_method:
                clientData.token_endpoint_auth_method || "none",
        };

        // Store client
        this.clients.set(clientId, {
            ...registeredClient,
            redirect_uris: clientData.redirect_uris || [],
        });

        console.log(`Registered client with ID: ${clientId}`);
        return registeredClient;
    }

    /**
     * Find client by ID
     * @param clientId The client ID
     * @returns The client object or undefined
     */
    public getClient(clientId: string): any {
        return this.clients.get(clientId);
    }

    /**
     * Store client information
     * @param clientId The client ID
     * @param clientData The client data
     */
    public setClient(clientId: string, clientData: any): void {
        this.clients.set(clientId, clientData);
    }

    /**
     * Find client by authorization code
     * @param code The authorization code
     * @returns Client object and ID, or null if not found
     */
    public findClientByAuthCode(
        code: string
    ): { client: any; clientId: string } | null {
        for (const [id, client] of this.clients.entries()) {
            if (
                client.authorization_code &&
                client.authorization_code.code === code
            ) {
                return { client, clientId: id };
            }
        }
        return null;
    }


    /**
     * Handle SSE connection with authentication
     * @param req Express Request
     * @param res Express Response
     * @returns void
     */
    public handleSseConnection(req: Request, res: Response): void {
        console.log("SSE connection requested with headers:", req.headers);

        // // Check for authorization header
        // const authHeader = req.headers.authorization;
        // if (!authHeader || !authHeader.startsWith("Bearer ")) {
        //     console.log("Unauthorized SSE connection attempt");

        //     // This header triggers the OAuth flow in MCP Inspector
        //     res.setHeader("WWW-Authenticate", "Bearer");
        //     res.status(401).end();
        //     return;
        // }

        // // Extract the token
        // const token = authHeader.substring(7);

        // checking auth header first
        let authHeader = req.headers.authorization;
        let token = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            // fallback: check query parameter (browser EventSource limitations)
            const url = new URL(req.url!, `http://${req.headers.host}`);
            token = url.searchParams.get("token");
        }

        if (!token) {
            console.log("No token provided in header or query");
            res.setHeader("WWW-Authenticate", "Bearer");
            res.status(401).end();
            return;
        }
        // Find the client with this token
        let tokenValid = false;
        let clientId = null;

        for (const [id, client] of this.clients.entries()) {
            if (client.tokens && client.tokens.access_token === token) {
                tokenValid = true;
                clientId = id;
                break;
            }
        }
        // try {
        //     const payload = JSON.parse(atob(token.split('.')[1]));
        //     if (payload.sub && payload.aud && payload.aud.includes('urn:terapotik-api')) {
        //         tokenValid = true;
        //         clientId = payload.sub;
        //     }
        // } catch (error) {
        //     console.log("Token validation failed:", error);
        // }
        if (!tokenValid) {
            console.log("Invalid token provided");
            res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
            res.status(401).end();
            return;
        }

        console.log(`Authenticated SSE connection for client: ${clientId}`);
        const connectionId = Date.now().toString();

        // Create a new transport for this connection
        const transport = new SSEServerTransport("/messages", res);

        // Create auth info object
        const authInfo = {
            clientId: clientId as string,
            token,
            client: this.clients.get(clientId as string),
        };

        // Store the connection with auth info
        this.activeConnections.set(connectionId, {
            transport,
            response: res,
            authInfo,
        });

        // Set up listener for session creation
        const transportAny = transport as any;
        if (typeof transportAny.on === "function") {
            transportAny.on("session", (sessionId: string) => {
                console.log(`Session created with ID: ${sessionId}`);
                // Store auth info mapped to session ID
                this.sessionAuth.set(sessionId, authInfo);
            });
        }

        // Handle client disconnect
        req.on("close", () => {
            this.activeConnections.delete(connectionId);
            console.log(
                `Client disconnected, remaining: ${this.activeConnections.size}`
            );
        });

        // Keep-alive to prevent connection timeout
        const keepAliveInterval = setInterval(() => {
            if (!res.writableEnded) {
                res.write(": ping\n\n");
            } else {
                clearInterval(keepAliveInterval);
            }
        }, 15000);

        // Connect to the MCP server with enhanced debugging
        console.log("Connecting to MCP server...");
        this.server
            .connect(transport)
            .then(() => {
                console.log("Successfully connected to MCP server");

                // Debug transport object - check if it has session information
                console.log("Transport properties:", Object.keys(transportAny));

                // Try to access session ID in different ways
                if (transportAny.sessionId) {
                    console.log(
                        `Found session ID in transport: ${transportAny.sessionId}`
                    );
                    this.sessionAuth.set(transportAny.sessionId, authInfo);
                }

                if (transportAny._sessionId) {
                    console.log(
                        `Found _sessionId in transport: ${transportAny._sessionId}`
                    );
                    this.sessionAuth.set(transportAny._sessionId, authInfo);
                }

                // Try to find session ID in the connection manager of the MCP server
                const mcpServerAny = this.server as any;
                if (mcpServerAny.connections) {
                    console.log(
                        `Server has ${Object.keys(mcpServerAny.connections).length
                        } connections`
                    );
                    for (const [sid, conn] of Object.entries(mcpServerAny.connections)) {
                        console.log(`Found connection with session ID: ${sid}`);
                        // If this is our newly created connection, associate it with auth info
                        this.sessionAuth.set(sid, authInfo);
                    }
                }
            })
            .catch((error) => {
                console.error("Error connecting to MCP server:", error);
            });
    }

    /**
     * Handle JSON-RPC messages with authentication
     * @param req Express Request
     * @param res Express Response
     */
    public async handleMessage(req: Request, res: Response) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

        try {
            // Check authentication
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                console.log("Unauthorized message attempt");
                res.setHeader("WWW-Authenticate", "Bearer");
                res.status(401).json({
                    jsonrpc: "2.0",
                    error: { code: -32600, message: "Unauthorized" },
                    id: null,
                });
                return;
            }

            // Extract and validate token
            const token = authHeader.substring(7);
            let tokenValid = false;
            let clientId = null;

            for (const [id, client] of this.clients.entries()) {
                if (client.tokens && client.tokens.access_token === token) {
                    tokenValid = true;
                    clientId = id;
                    break;
                }
            }
            // try {
            //     const payload = JSON.parse(atob(token.split('.')[1]));
            //     if (payload.sub && payload.aud && payload.aud.includes('urn:terapotik-api')) {
            //         tokenValid = true;
            //         clientId = payload.sub;
            //     }
            // } catch (error) {
            //     console.log("Token validation failed:", error);
            // }
            // if (!tokenValid) {
            //     console.log("Invalid token in message");
            //     res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
            //     res.status(401).json({
            //         jsonrpc: "2.0",
            //         error: { code: -32600, message: "Invalid token" },
            //         id: null,
            //     });
            //     return;
            // }

            // Parse message
            let message;
            if (typeof req.body === "string") {
                try {
                    message = JSON.parse(req.body);
                } catch (e) {
                    res.status(400).json({
                        jsonrpc: "2.0",
                        error: { code: -32700, message: "Parse error" },
                        id: null,
                    });
                    return;
                }
            } else {
                message = req.body;
            }

            console.log("Received message:", message);

            // If this is a protocol message, intercept and check for session ID
            if (message.method === "mcp.protocol") {
                // Extract session ID from the message if available
                const sessionId = message?.params?.sessionId;
                if (sessionId && clientId) {
                    // Create auth info object
                    const authInfo = {
                        clientId: clientId,
                        token,
                        client: this.clients.get(clientId),
                    };

                    // Store or update auth info for this session
                    console.log(
                        `Associating session ${sessionId} with client ${clientId}`
                    );
                    this.sessionAuth.set(sessionId, authInfo);
                }
            }

            // Process message
            if (message.jsonrpc === "2.0" && message.method) {
                if (this.activeConnections.size === 0) {
                    console.log("No active connections to handle message");
                    res.status(400).json({
                        jsonrpc: "2.0",
                        error: { code: -32000, message: "No active connections" },
                        id: message.id || null,
                    });
                    return;
                }

                const firstConnection = Array.from(this.activeConnections.values())[0];
                if (typeof firstConnection.transport.handleMessage === "function") {
                    try {
                        console.log("Forwarding message to transport");
                        const result = await firstConnection.transport.handleMessage(
                            message
                        );
                        console.log("Response from transport:", result);
                        res.json(result);
                        return;
                    } catch (error) {
                        console.error("Error handling message:", error);
                        res.status(500).json({
                            jsonrpc: "2.0",
                            error: { code: -32603, message: "Internal error" },
                            id: message.id || null,
                        });
                        return;
                    }
                } else {
                    console.error("Transport lacks handleMessage method");
                    res.json({
                        jsonrpc: "2.0",
                        result: { success: true },
                        id: message.id,
                    });
                    return;
                }
            } else {
                console.log("Invalid JSON-RPC message:", message);
                res.status(400).json({
                    jsonrpc: "2.0",
                    error: { code: -32600, message: "Invalid Request" },
                    id: message.id || null,
                });
                return;
            }
        } catch (error) {
            console.error("Error processing message:", error);
            res.status(500).json({
                jsonrpc: "2.0",
                error: { code: -32603, message: "Internal error" },
                id: null,
            });
            return;
        }
    }

    /**
     * Get token info for a session
     * @param sessionId The session ID
     * @returns Token info or undefined if not found
     */
    public getTokenInfoForSession(sessionId: string): any | undefined {
        // Look up auth info by session ID
        const authInfo = this.sessionAuth.get(sessionId);

        if (!authInfo) {
            console.log(`No auth info found for session ID ${sessionId}`);
            return undefined;
        }

        // Log auth info tokens directly
        if (authInfo.token) {
            console.log(`Auth info has direct token property:`, {
                tokenLength: authInfo.token ? authInfo.token.length : 0,
                directToken: authInfo.token,
            });

            // Debug if it's an encrypted JWT
            try {
                const tokenParts = authInfo.token.split(".");
                const headerBase64 = tokenParts[0];
                if (headerBase64) {
                    const headerJson = Buffer.from(headerBase64, "base64").toString(
                        "utf8"
                    );
                    const header = JSON.parse(headerJson);
                    console.log(`Auth info token header: ${JSON.stringify(header)}`);
                }
            } catch (error) {
                console.log(`Unable to parse auth info token header`);
            }
        }

        // Get the client from the clients map
        const client = this.clients.get(authInfo.clientId);

        if (!client) {
            console.log(`No client found for client ID ${authInfo.clientId}`);
            return undefined;
        }

        // Get token data
        const tokenInfo = client.tokens || {};

        // Log token info for debugging
        console.log(`Token info for session ${sessionId}:`, {
            hasAccessToken: !!tokenInfo.access_token,
            hasIdToken: !!tokenInfo.id_token,
            accessTokenLength: tokenInfo.access_token
                ? tokenInfo.access_token.length
                : 0,
            fullAccessToken: tokenInfo.access_token,
        });

        // Debug client's access token format
        if (tokenInfo.access_token) {
            try {
                const tokenParts = tokenInfo.access_token.split(".");
                if (tokenParts.length === 3) {
                    // This appears to be a standard JWT (not encrypted)
                    console.log("Client token appears to be a standard JWT");
                    const headerBase64 = tokenParts[0];
                    if (headerBase64) {
                        const headerJson = Buffer.from(headerBase64, "base64").toString(
                            "utf8"
                        );
                        console.log(`Client token header: ${headerJson}`);
                    }
                } else {
                    console.log(
                        `Client token is not in standard JWT format, has ${tokenParts.length} parts`
                    );
                }
            } catch (error) {
                console.log(`Unable to parse client token header`);
            }
        }

        // Return both auth info (with direct token) and token info from client
        return {
            ...authInfo,
            clientTokens: tokenInfo,
        };
    }
}

