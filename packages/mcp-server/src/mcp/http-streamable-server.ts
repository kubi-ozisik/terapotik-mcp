import express, { Express, Request, Response } from "express";
import cors from "cors";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from "crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

/**
 * Simple HTTP streamable MCP server for Claude Desktop and other HTTP clients
 * No OAuth, no SSE - just clean HTTP streamable transport
 */
export class HttpStreamableServer {
    private app: Express;
    private mcpServer: McpServer;
    private transports: Map<string, StreamableHTTPServerTransport> = new Map();
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
        
        // Initialize MCP server with tools
        this.mcpServer = new McpServer({
            name: this.serverName,
            version: this.serverVersion,
        });
        
        this.registerTools();
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        this.app.use(cors({
            exposedHeaders: ['Mcp-Session-Id'],
            allowedHeaders: ['Content-Type', 'mcp-session-id'],
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
                activeSessions: this.transports.size
            });
        });
    }

    /**
     * Register MCP tools
     */
    private registerTools(): void {
        // this.mcpServer.registerTool(
        //     "ping",
        //     {
        //         title: "Ping",
        //         description: "Simple ping tool to test HTTP streamable transport",
        //         inputSchema: {
        //             type: "object",
        //             properties: {
        //                 message: {
        //                     type: "string",
        //                     description: "Message to echo back"
        //                 }
        //             }
        //         },
        //     },
        //     async (args) => {
        //         return {
        //             content: [
        //                 {
        //                     type: "text",
        //                     text: `Pong! You said: ${args.message || "nothing"} (via HTTP streamable transport)`
        //                 }
        //             ],
        //         };
        //     }
        // );
    }

    /**
     * Handle MCP HTTP streamable requests
     */
    private async handleMcpRequest(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            let transport: StreamableHTTPServerTransport;

            if (sessionId && this.transports.has(sessionId)) {
                // Reuse existing transport
                transport = this.transports.get(sessionId)!;
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId) => {
                        // Store the transport by session ID
                        this.transports.set(sessionId, transport);
                        process.stderr.write(`HTTP streamable session initialized: ${sessionId}\n`);
                    },
                });

                // Clean up transport when closed
                transport.onclose = () => {
                    if (transport.sessionId) {
                        this.transports.delete(transport.sessionId);
                        process.stderr.write(`HTTP streamable session closed: ${transport.sessionId}\n`);
                    }
                };

                // Connect to the MCP server
                await this.mcpServer.connect(transport);
                process.stderr.write('HTTP streamable transport connected to MCP server\n');
            } else {
                // Invalid request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided or invalid initialization',
                    },
                    id: null,
                });
                return;
            }

            // Handle the request
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            process.stderr.write(`Error handling HTTP streamable MCP request: ${error}\n`);
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

    /**
     * Add a custom tool to the MCP server
     */
    public addTool(
        name: string,
        schema: any,
        handler: (args: any) => Promise<any>
    ): void {
        this.mcpServer.registerTool(name, schema, handler);
    }

    /**
     * Get the Express app (useful for adding custom routes)
     */
    public getApp(): Express {
        return this.app;
    }

    /**
     * Get the internal MCP server instance (for tool registration)
     */
    public getMcpServer(): McpServer {
        return this.mcpServer;
    }

    /**
     * Get active session count
     */
    public getActiveSessionCount(): number {
        return this.transports.size;
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
     * Stop the server and cleanup
     */
    public stop(): void {
        // Close all active transports
        for (const transport of this.transports.values()) {
            transport.close?.();
        }
        this.transports.clear();
        process.stderr.write('HTTP Streamable MCP Server stopped\n');
    }
}
