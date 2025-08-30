// packages/mcp-client/src/index.ts
import crypto from 'crypto';
import { URLSearchParams } from 'url';
import readline from 'readline';

interface OAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

class MCPTestClient {
  private mcpServerUrl: string;
  private redirectUri: string;
  private codeVerifier?: string;
  private codeChallenge?: string;

  constructor(mcpServerUrl: string = 'http://localhost:3001') {
    this.mcpServerUrl = mcpServerUrl;
    this.redirectUri = 'http://localhost:8080/callback'; // Dummy callback
  }

  // Step 1: Discover OAuth endpoints
  async discoverEndpoints() {
    try {
      console.log('🔍 Discovering OAuth endpoints...');
      const oauthMetadataUrl = `${this.mcpServerUrl}/.well-known/oauth-authorization-server`;
      
      const response = await fetch(oauthMetadataUrl);
      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log('✅ Found OAuth endpoints');
      return metadata;
    } catch (error) {
      console.error('❌ Discovery failed:', error);
      throw error;
    }
  }

  // Step 2: Register client dynamically
  async registerClient(endpoints: any): Promise<string> {
    try {
      console.log('📝 Registering OAuth client...');
      
      const registrationData = {
        client_name: 'MCP Test Client',
        redirect_uris: [this.redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
        response_types: ['code'],
      };

      const response = await fetch(endpoints.registration_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const clientInfo = await response.json();
      console.log(`✅ Client registered with ID: ${clientInfo.client_id}`);
      return clientInfo.client_id;
    } catch (error) {
      console.error('❌ Client registration failed:', error);
      throw error;
    }
  }

  // Step 3: Generate PKCE for security
  private generatePKCE() {
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    this.codeChallenge = crypto
      .createHash('sha256')
      .update(this.codeVerifier)
      .digest('base64url');
  }

  // Step 4: Get authorization URL
  async getAuthorizationUrl(): Promise<{ url: string, clientId: string, endpoints: any }> {
    const endpoints = await this.discoverEndpoints();
    const clientId = await this.registerClient(endpoints);
    this.generatePKCE();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: this.redirectUri,
      scope: 'openid profile',
      state: crypto.randomBytes(16).toString('hex'),
      code_challenge: this.codeChallenge!,
      code_challenge_method: 'S256',
    });

    const authUrl = `${endpoints.authorization_endpoint}?${params.toString()}`;
    return { url: authUrl, clientId, endpoints };
  }

  // Step 5: Exchange code for tokens
  async exchangeCodeForTokens(code: string, clientId: string, endpoints: any): Promise<OAuthTokens> {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');

      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier!,
      });

      const response = await fetch(endpoints.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
      }

      const tokens = await response.json();
      console.log('✅ Tokens received successfully');
      return tokens;
    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      throw error;
    }
  }

  // Step 6: Connect via SSE and call MCP tools
  async testMCPViaSSE(accessToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to MCP server via SSE...');

      // Create SSE connection with Authorization header
      const sseUrl = `${this.mcpServerUrl}/sse`;
      
      // Use node-fetch or similar for SSE in Node.js
      const EventSource = require('eventsource');
      const eventSource = new EventSource(sseUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      });

      let connected = false;
      let messageId = 1;

      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        connected = true;

        // Send initialization request
        setTimeout(() => {
          this.sendMCPMessage(accessToken, {
            jsonrpc: '2.0',
            id: messageId++,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              clientInfo: {
                name: 'MCP Test Client',
                version: '1.0.0'
              }
            }
          });
        }, 100);
      };

      eventSource.onmessage = (event: any) => {
        try {
          console.log('📨 Received SSE message:', event.data);
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.method === 'notifications/initialized') {
            console.log('🎉 MCP connection initialized');
            this.testMCPTools(accessToken, messageId);
          } else if (data.result) {
            console.log('📋 MCP Result:', JSON.stringify(data.result, null, 2));
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error: any) => {
        console.error('❌ SSE connection error:', error);
        if (!connected) {
          reject(new Error('Failed to establish SSE connection'));
        }
        eventSource.close();
      };

      // Auto-resolve after testing
      setTimeout(() => {
        eventSource.close();
        resolve();
      }, 10000); // 10 seconds timeout
    });
  }

  // Send MCP message via HTTP POST to /messages
  private async sendMCPMessage(accessToken: string, message: any): Promise<void> {
    try {
      console.log('📤 Sending MCP message:', JSON.stringify(message, null, 2));

      const response = await fetch(`${this.mcpServerUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(`❌ Message send failed: ${response.status} ${response.statusText}`);
      } else {
        console.log('✅ Message sent successfully');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  // Test various MCP tools
  private async testMCPTools(accessToken: string, messageId: number): Promise<void> {
    // Test 1: List tools
    setTimeout(() => {
      this.sendMCPMessage(accessToken, {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/list',
        params: {}
      });
    }, 1000);

    // Test 2: Call whoami
    setTimeout(() => {
      this.sendMCPMessage(accessToken, {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'whoami',
          arguments: {}
        }
      });
    }, 2000);

    // Test 3: Try calendar tool
    setTimeout(() => {
      this.sendMCPMessage(accessToken, {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'getEventsForToday',
          arguments: {}
        }
      });
    }, 3000);
  }

  // Helper to get user input
  private async getUserInput(prompt: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // Main test flow
  async runTest(): Promise<void> {
    console.log('🚀 Starting MCP OAuth Test\n');

    try {
      // Step 1-4: Get authorization URL
      const { url, clientId, endpoints } = await this.getAuthorizationUrl();
      
      console.log('\n📋 Next steps:');
      console.log('1. Open this URL in your browser:');
      console.log(`   ${url}`);
      console.log('2. Complete the login and authorization');
      console.log('3. You will be redirected to a URL that starts with:');
      console.log(`   ${this.redirectUri}?code=...`);
      console.log('4. Copy the "code" parameter from that URL\n');

      // Get authorization code from user
      const code = await this.getUserInput('Enter the authorization code: ');

      if (!code) {
        throw new Error('No authorization code provided');
      }

      // Step 5: Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, clientId, endpoints);

      // Step 6: Test MCP tools via SSE
      console.log('\n🧪 Testing MCP tools via SSE...\n');
      await this.testMCPViaSSE(tokens.access_token);

      console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    }
  }
}

// Run the test
async function main() {
  const client = new MCPTestClient();
  await client.runTest();
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { MCPTestClient };