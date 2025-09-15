// packages/mcp-client/src/oauth-flow.ts
import crypto from 'crypto';
import { URLSearchParams } from 'url';

interface OAuthConfig {
  mcpServerUrl: string;
  clientId?: string;
  redirectUri: string;
  scopes?: string[];
}

interface OAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export class MCPOAuthClient {
  private config: OAuthConfig;
  private codeVerifier?: string;
  private codeChallenge?: string;

  constructor(config: OAuthConfig) {
    this.config = {
      scopes: ['openid', 'profile'],
      ...config
    };
  }

  /**
   * Step 1: Discover OAuth endpoints from MCP server
   */
  async discoverEndpoints() {
    try {
      // First, try to get MCP configuration
      const mcpConfigUrl = `${this.config.mcpServerUrl}/.well-known/mcp-configuration`;
      console.log(`Discovering MCP configuration: ${mcpConfigUrl}`);
      
      const mcpResponse = await fetch(mcpConfigUrl);
      if (mcpResponse.ok) {
        const mcpConfig = await mcpResponse.json();
        console.log('MCP Configuration:', mcpConfig);
        
        if (mcpConfig.oauth) {
          return {
            authorization_endpoint: mcpConfig.oauth.authorization_endpoint,
            token_endpoint: mcpConfig.oauth.token_endpoint,
            registration_endpoint: mcpConfig.oauth.registration_endpoint,
          };
        }
      }

      // Fallback: Try OAuth server metadata discovery
      const oauthMetadataUrl = `${this.config.mcpServerUrl}/.well-known/oauth-authorization-server`;
      console.log(`Discovering OAuth metadata: ${oauthMetadataUrl}`);
      
      const oauthResponse = await fetch(oauthMetadataUrl);
      if (!oauthResponse.ok) {
        throw new Error(`OAuth discovery failed: ${oauthResponse.statusText}`);
      }
      
      const metadata = await oauthResponse.json();
      console.log('OAuth Server Metadata:', metadata);
      
      return {
        authorization_endpoint: metadata.authorization_endpoint,
        token_endpoint: metadata.token_endpoint,
        registration_endpoint: metadata.registration_endpoint,
      };
    } catch (error) {
      console.error('Discovery failed:', error);
      throw error;
    }
  }

  /**
   * Step 2: Register client dynamically (if needed)
   */
  async registerClient(endpoints: any): Promise<string> {
    if (this.config.clientId) {
      console.log(`Using existing client ID: ${this.config.clientId}`);
      return this.config.clientId;
    }

    if (!endpoints.registration_endpoint) {
      throw new Error('Dynamic client registration not supported - client_id required');
    }

    console.log(`Registering client with: ${endpoints.registration_endpoint}`);

    const registrationData = {
      client_name: 'MCP HTTP Test Client',
      redirect_uris: [this.config.redirectUri],
      token_endpoint_auth_method: 'none', // Public client
      grant_types: ['authorization_code'],
      response_types: ['code'],
    };

    const response = await fetch(endpoints.registration_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      throw new Error(`Client registration failed: ${response.statusText}`);
    }

    const clientInfo = await response.json();
    console.log('Client registered:', clientInfo);
    
    return clientInfo.client_id;
  }

  /**
   * Step 3: Generate PKCE challenge for security
   */
  private generatePKCE() {
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    this.codeChallenge = crypto
      .createHash('sha256')
      .update(this.codeVerifier)
      .digest('base64url');
  }

  /**
   * Step 4: Create authorization URL for user consent
   */
  async createAuthorizationUrl(): Promise<string> {
    const endpoints = await this.discoverEndpoints();
    const clientId = await this.registerClient(endpoints);
    
    this.generatePKCE();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes!.join(' '),
      state: crypto.randomBytes(16).toString('hex'),
      code_challenge: this.codeChallenge!,
      code_challenge_method: 'S256',
    });

    const authUrl = `${endpoints.authorization_endpoint}?${params.toString()}`;
    console.log('Authorization URL:', authUrl);
    return authUrl;
  }

  /**
   * Step 5: Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<OAuthTokens> {
    if (!this.codeVerifier) {
      throw new Error('No code verifier found - must call createAuthorizationUrl first');
    }

    const endpoints = await this.discoverEndpoints();
    const clientId = this.config.clientId || await this.registerClient(endpoints);

    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.codeVerifier,
    });

    console.log(`Exchanging code for tokens: ${endpoints.token_endpoint}`);

    const response = await fetch(endpoints.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
    }

    const tokens = await response.json();
    console.log('Tokens received:', {
      access_token: tokens.access_token ? `${tokens.access_token.substring(0, 20)}...` : 'none',
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
    });

    return tokens;
  }
}