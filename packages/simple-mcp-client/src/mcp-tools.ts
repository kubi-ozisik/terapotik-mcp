// packages/mcp-client/src/mcp-tools.ts
export interface MCPToolCall {
    method: string;
    params: {
      name: string;
      arguments?: any;
    };
  }
  
  export interface MCPResponse {
    result?: any;
    error?: {
      code: number;
      message: string;
    };
  }
  
  export class MCPToolsClient {
    private baseUrl: string;
    private accessToken: string;
  
    constructor(baseUrl: string, accessToken: string) {
      this.baseUrl = baseUrl;
      this.accessToken = accessToken;
    }
  
    /**
     * Call the whoami tool via HTTP
     */
    async callWhoAmI(): Promise<any> {
      return this.callTool('whoami', {});
    }
  
    /**
     * List all available tools
     */
    async listTools(): Promise<any> {
      const request = {
        jsonrpc: '2.0',
        id: this.generateId(),
        method: 'tools/list',
        params: {}
      };
  
      return this.makeRequest(request);
    }
  
    /**
     * Call a specific MCP tool
     */
    async callTool(toolName: string, args: any = {}): Promise<any> {
      const request = {
        jsonrpc: '2.0',
        id: this.generateId(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };
  
      return this.makeRequest(request);
    }
  
    /**
     * Make HTTP request to MCP server
     */
    private async makeRequest(request: any): Promise<any> {
      try {
        console.log('Making MCP request:', JSON.stringify(request, null, 2));
  
        const response = await fetch(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(request),
        });
  
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        const result = await response.json();
        console.log('MCP response:', JSON.stringify(result, null, 2));
  
        if (result.error) {
          throw new Error(`MCP Error ${result.error.code}: ${result.error.message}`);
        }
  
        return result.result;
      } catch (error) {
        console.error('MCP request failed:', error);
        throw error;
      }
    }
  
    /**
     * Test MCP connection and tools
     */
    async testConnection(): Promise<void> {
      console.log('\n=== Testing MCP Connection ===');
  
      try {
        // Test 1: List available tools
        console.log('\n1. Listing available tools...');
        const tools = await this.listTools();
        console.log('Available tools:', tools);
  
        // Test 2: Call whoami tool
        console.log('\n2. Calling whoami tool...');
        const whoami = await this.callWhoAmI();
        console.log('WhoAmI result:', whoami);
  
        // Test 3: Try a calendar tool if available
        if (tools && tools.tools && tools.tools.some((t: any) => t.name === 'getEventsForToday')) {
          console.log('\n3. Testing getEventsForToday...');
          const events = await this.callTool('getEventsForToday', {});
          console.log('Events result:', events);
        }
  
        console.log('\n✅ All tests passed!');
      } catch (error) {
        console.error('\n❌ Test failed:', error);
        throw error;
      }
    }
  
    private generateId(): string {
      return Math.random().toString(36).substring(2, 15);
    }
  }