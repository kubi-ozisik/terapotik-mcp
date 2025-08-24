import dotenv from "dotenv";
import { UnifiedMcpServer } from "./mcp/unified-mcp-server";
import { config } from "./config";
import { ApiClient } from "./services/api-client";
import { ApiService } from "./services/api-service";
import { UserProfileTool } from "./tools/user-profile-tool";
import { Env } from "./types"; // todo: move to shared project
// Load environment variables
dotenv.config();

// Declare environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}

async function main() {
  // Initialize services
  const apiClient = new ApiClient(config.api);
  const apiService = new ApiService(apiClient);
  const userProfileTool = new UserProfileTool(apiService);

  // Create unified server
  const unifiedServer = new UnifiedMcpServer({
    name: "Terapotik MCP Server",
    version: "1.0.0",
    enableSSE: true,    // Your working SSE + OAuth server
    enableHTTP: true,   // Add HTTP streamable support
    ssePort: 3001,      // Keep your working SSE server on 3001
    httpPort: 3002      // Add HTTP streamable on 3002
  });


  // Start the server (both SSE and HTTP)
  await unifiedServer.start();

  // Register tools
  // this part will be refactored as there is a need for generic
  // tool registration across all transports
  const httpServer = unifiedServer.getHTTPServer();
  if (httpServer) {
    console.log("registering tool to http server");
    userProfileTool.register(httpServer.getMcpServer());
  }
  console.log('\n🎉 Unified MCP Server started successfully!');
  console.log('📊 Server Status:', JSON.stringify(unifiedServer.getStatus(), null, 2));
  console.log('\n🔗 Available endpoints:');
  console.log('- SSE + OAuth: http://localhost:3001 (for MCP Inspector)');
  console.log('- HTTP Streamable: http://localhost:3002/mcp (for Claude Desktop)');
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Failed to start unified server:', error);
  process.exit(1);
});
