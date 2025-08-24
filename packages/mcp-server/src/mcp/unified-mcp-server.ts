import { McpExpressServer } from './mcp-express-server';
import { HttpStreamableServer } from './http-streamable-server';

// Type definitions
type ToolHandler = (params: any, context: any) => Promise<any>;

interface ToolRegistration {
  name: string;
  description: string;
  schema: any;
  handler: ToolHandler;
}

interface UnifiedServerConfig {
  name: string;
  version: string;
  ssePort?: number;
  httpPort?: number;
  enableSSE?: boolean;
  enableHTTP?: boolean;
  enableStdio?: boolean;
}

/**
 * Unified MCP Server that orchestrates multiple transport types:
 * - SSE with OAuth (via McpExpressServer) 
 * - HTTP Streamable (via HttpStreamableServer)
 * - Stdio (for Claude Desktop)
 */
export class UnifiedMcpServer {
  private config: UnifiedServerConfig;
  private tools: Map<string, ToolRegistration> = new Map();
  
  // Server instances
  private sseServer?: McpExpressServer;
  private httpServer?: HttpStreamableServer;

  constructor(config: UnifiedServerConfig) {
    this.config = {
      enableSSE: true,
      enableHTTP: true,
      enableStdio: false,
      ssePort: 3001,
      httpPort: 3002,
      ...config
    };
  }

  /**
   * Register a tool that will be available across all enabled transports
   */
  public registerTool(
    name: string,
    description: string,
    schema: any,
    handler: ToolHandler
  ): void {
    this.tools.set(name, {
      name,
      description,
      schema,
      handler
    });

    // Register on existing servers if they're already initialized
    if (this.httpServer) {
      this.httpServer.addTool(name, {
        title: name,
        description,
        inputSchema: schema,
      }, async (args) => {
        // Adapt the handler to match HttpStreamableServer's expected signature
        return handler(args, { transportType: 'http' });
      });
    }

    // Note: SSE server tools are registered differently via AuthenticatedMcpServer
    // This would need to be handled in the SSE server initialization
  }

  /**
   * Get all registered tools
   */
  public getTools(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Initialize SSE server (OAuth + SSE transport)
   */
  public initializeSSEServer(): McpExpressServer | undefined {
    if (!this.config.enableSSE) return undefined;

    if (!this.sseServer) {
      this.sseServer = new McpExpressServer(
        this.config.name,
        this.config.version,
        this.config.ssePort!
      );

      process.stderr.write(`SSE server initialized on port ${this.config.ssePort}\n`);
    }
    return this.sseServer;
  }

  /**
   * Initialize HTTP streamable server
   */
  public initializeHTTPServer(): HttpStreamableServer | undefined {
    if (!this.config.enableHTTP) return undefined;

    if (!this.httpServer) {
      this.httpServer = new HttpStreamableServer(
        `${this.config.name} HTTP`,
        this.config.version,
        this.config.httpPort!
      );

      // Register all existing tools
      for (const tool of this.tools.values()) {
        this.httpServer.addTool(tool.name, {
          title: tool.name,
          description: tool.description,
          inputSchema: tool.schema,
        }, async (args) => {
          // Adapt the handler to match HttpStreamableServer's expected signature
          return tool.handler(args, { transportType: 'http' });
        });
      }

      process.stderr.write(`HTTP streamable server initialized on port ${this.config.httpPort}\n`);
    }
    return this.httpServer;
  }

  /**
   * Start all enabled servers
   */
  public async start(): Promise<void> {
    const promises: Promise<void>[] = [];

    // Start SSE server
    if (this.config.enableSSE) {
      const sseServer = this.initializeSSEServer();
      if (sseServer) {
        promises.push(new Promise<void>((resolve) => {
          sseServer.start();
          resolve();
        }));
      }
    }

    // Start HTTP server
    if (this.config.enableHTTP) {
      const httpServer = this.initializeHTTPServer();
      if (httpServer) {
        promises.push(new Promise<void>((resolve) => {
          httpServer.start();
          resolve();
        }));
      }
    }

    // TODO: Will add stdio support
    if (this.config.enableStdio) {
      process.stderr.write('Stdio transport not yet implemented in unified server\n');
    }

    await Promise.all(promises);
    
    process.stderr.write(`Unified MCP Server started:\n`);
    process.stderr.write(`- SSE + OAuth: ${this.config.enableSSE ? `http://localhost:${this.config.ssePort}` : 'disabled'}\n`);
    process.stderr.write(`- HTTP Streamable: ${this.config.enableHTTP ? `http://localhost:${this.config.httpPort}` : 'disabled'}\n`);
    process.stderr.write(`- Stdio: ${this.config.enableStdio ? 'enabled' : 'disabled'}\n`);
  }

  /**
   * Get server instances
   */
  public getSSEServer(): McpExpressServer | undefined {
    return this.sseServer;
  }

  public getHTTPServer(): HttpStreamableServer | undefined {
    return this.httpServer;
  }

  /**
   * Get server status
   */
  public getStatus() {
    return {
      sse: {
        enabled: this.config.enableSSE,
        port: this.config.ssePort,
        running: !!this.sseServer
      },
      http: {
        enabled: this.config.enableHTTP,
        port: this.config.httpPort,
        running: !!this.httpServer,
        activeSessions: this.httpServer?.getActiveSessionCount() || 0
      },
      stdio: {
        enabled: this.config.enableStdio,
        running: false // TODO: implement
      },
      tools: this.tools.size
    };
  }

  /**
   * Stop all servers gracefully
   */
  public async stop(): Promise<void> {
    process.stderr.write('Shutting down Unified MCP Server...\n');
    
    const shutdownPromises: Promise<void>[] = [];
    
    if (this.httpServer) {
      shutdownPromises.push(new Promise<void>((resolve) => {
        this.httpServer!.stop();
        resolve();
      }));
    }
    
    // TODO: Add SSE server graceful shutdown when implemented
    if (this.sseServer) {
      process.stderr.write('SSE server shutdown not yet implemented\n');
    }
    
    await Promise.all(shutdownPromises);
    process.stderr.write('Unified MCP Server stopped\n');
  }

  /**
   * Setup graceful shutdown handlers
   */
  public setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      process.stderr.write(`Received ${signal}, shutting down gracefully...\n`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      process.stderr.write(`Uncaught exception: ${error.message}\n`);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      process.stderr.write(`Unhandled rejection: ${reason}\n`);
      gracefulShutdown('unhandledRejection');
    });
  }
}
