import express, { Express, Request, Response } from "express";
import { BaseOAuthHandler } from "../base-oauth-handler";

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}

export abstract class GitHubProvider extends BaseOAuthHandler {
  protected app: Express;
  readonly providerName = 'github';
  readonly authUrl = 'https://github.com/login/oauth/authorize';
  readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  readonly userInfoUrl = 'https://api.github.com/user';

  constructor(baseUrl: string, port: number) {
    super(baseUrl);
    this.app = express();
  }

  // Abstract methods - each server must implement these
  protected abstract getClient(clientId: string): any;
  protected abstract setClient(clientId: string, client: any): void;
  protected abstract findClientByAuthCode(code: string): { client: any; clientId: string } | null;

  getClientId(): string {
    return process.env.GITHUB_CLIENT_ID!;
  }

  getClientSecret(): string {
    return process.env.GITHUB_CLIENT_SECRET!;
  }

  getRedirectUri(): string {
    return `${this.baseUrl}/callback`;
  }

  getScopes(): string[] {
    return ['user:email', 'read:user'];
  }

  buildAuthUrl(state: string, codeChallenge?: string): string {
    const url = new URL(this.authUrl);
    url.searchParams.set('client_id', this.getClientId());
    url.searchParams.set('redirect_uri', this.getRedirectUri());
    url.searchParams.set('scope', this.getScopes().join(' '));
    url.searchParams.set('state', state);
    
    return url.toString();
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.getClientId(),
        client_secret: this.getClientSecret(),
        code,
        redirect_uri: this.getRedirectUri(),
      }),
    });
    
    return response.json() as Promise<TokenResponse>;
  }

  async getUserInfo(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(this.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    return response.json() as Promise<GitHubUser>;
  }

  protected setupRoutes(): void {
    // OAuth discovery endpoints
    this.app.get('/.well-known/oauth-authorization-server', (req, res) => {
      this.handleOAuthMetadataRequest(req, res);
    });

    this.app.options('/.well-known/oauth-authorization-server', this.handleCorsOptions);

    // Client registration endpoint
    this.app.post('/register', (req, res) => {
      this.handleClientRegistration(req, res);
    });

    this.app.options('/register', this.handleCorsOptions);

    // Authorization endpoint
    this.app.get('/authorize', (req, res) => {
      this.handleAuthorization(req, res);
    });

    this.app.options('/authorize', this.handleCorsOptions);

    // callback endpoint
    this.app.get('/callback', (req, res) => {
      this.handleAuthCallback(req, res);
    });

    this.app.options('/callback', this.handleCorsOptions);

    // token endpoint
    this.app.post('/token', (req, res) => {
      this.handleTokenRequest(req, res);
    });

    this.app.options('/token', this.handleCorsOptions);

    // consent confirmation endpoint
    this.app.post('/authorize/consent', (req, res) => {
      this.handleConsentConfirmation(req, res);
    });

    this.app.options('/authorize/consent', this.handleCorsOptions);

    // JWKS endpoint
    this.app.get("/.well-known/jwks.json", (req, res) => {
      this.handleJwksRequest(req, res);
    });

    this.app.options("/.well-known/jwks.json", this.handleCorsOptions);
  }

  // OAuth metadata endpoint
  protected handleOAuthMetadataRequest(req: Request, res: Response): void {
    console.log("OAuth metadata requested from:", req.headers.origin || "unknown");

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Content-Type", "application/json; charset=utf-8");
    res.header("Cache-Control", "no-store");
    res.header("Pragma", "no-cache");

    res.json(this.getOAuthServerMetadata());
  }

  private getOAuthServerMetadata(): any {
    return {
      issuer: this.baseUrl,
      authorization_endpoint: `${this.baseUrl}/authorize`,
      token_endpoint: `${this.baseUrl}/token`,
      registration_endpoint: `${this.baseUrl}/register`,
      jwks_uri: `${this.baseUrl}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: this.getScopes(),
    };
  }

  // JWKS endpoint
  protected handleJwksRequest(req: Request, res: Response): void {
    console.log("JWKS requested from:", req.headers.origin || "unknown");

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Content-Type", "application/json; charset=utf-8");
    res.header("Cache-Control", "public, max-age=86400");

    // GitHub doesn't have JWKS, return empty
    res.json({
      keys: []
    });
  }

  // Client registration
  protected handleClientRegistration(req: Request, res: Response): void {
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

  private registerClient(clientData: any): any {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const registeredClient = {
      ...clientData,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      token_endpoint_auth_method: clientData.token_endpoint_auth_method || "none",
      redirect_uris: clientData.redirect_uris || [],
      client_name: clientData.client_name || 'GitHub MCP Client',
      grant_types: clientData.grant_types || ['authorization_code'],
      response_types: clientData.response_types || ['code'],
    };
    this.setClient(clientId, registeredClient);
    return registeredClient;
  }

  // Authorization endpoint
  protected handleAuthorization(req: Request, res: Response): void {
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

    client.pending_request = {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    };

    this.setClient(client_id as string, client);

    const githubUrl = this.buildAuthUrl(state as string, code_challenge as string);
    console.log(`Redirecting to GitHub: ${githubUrl}`);
    res.redirect(githubUrl);
  }

  // Token endpoint
  protected async handleTokenRequest(req: Request, res: Response): Promise<void> {
    console.log("Token request received with body:", req.body);

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    try {
      let formData: any;
      if (typeof req.body === "string") {
        formData = Object.fromEntries(new URLSearchParams(req.body).entries());
      } else {
        formData = req.body;
      }

      const grant_type = formData.grant_type;
      const code = formData.code;

      if (!code) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Authorization code is required",
        });
        return;
      }

      const foundClient = this.findClientByAuthCode(code);
      if (!foundClient) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        });
        return;
      }

      if (grant_type === "authorization_code") {
        // Exchange code for tokens with GitHub
        const tokenResponse = await this.exchangeCodeForTokens(code);
        
        // Store tokens with client
        foundClient.client.tokens = tokenResponse;
        this.setClient(foundClient.clientId, foundClient.client);

        res.json({
          access_token: tokenResponse.access_token,
          token_type: tokenResponse.token_type || "Bearer",
          expires_in: 3600,
          scope: tokenResponse.scope,
        });
      } else {
        res.status(400).json({
          error: "unsupported_grant_type",
          error_description: "Unsupported grant type",
        });
      }
    } catch (error) {
      console.error("Token endpoint error:", error);
      res.status(500).json({
        error: "server_error",
        error_description: "Internal server error",
      });
    }
  }

  // GitHub callback
  protected async handleAuthCallback(req: Request, res: Response): Promise<void> {
    console.log("GitHub callback received with query params:", req.query);

    const { code, state, error } = req.query;

    if (error) {
      console.error("GitHub returned an error:", error);
      res.status(400).send(`GitHub error: ${error}`);
      return;
    }

    if (!code || !state) {
      console.error("Missing code or state:", { code, state });
      res.status(400).send("Missing code or state");
      return;
    }

    try {
      // Find client by state
      const client = this.getClient(state as string);
      if (!client) {
        console.error("Invalid client:", state);
        res.status(400).send("Invalid client");
        return;
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code as string);
      client.tokens = tokenResponse;
      this.setClient(state as string, client);

      // Generate MCP authorization code
      const mcpCode = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      client.authorization_code = {
        code: mcpCode,
        redirect_uri: client.pending_request?.redirect_uri,
        expires_at: Date.now() + 600000, // 10 minutes
      };
      this.setClient(state as string, client);

      // Redirect back to MCP client
      const redirectUrl = new URL(client.pending_request?.redirect_uri as string);
      redirectUrl.searchParams.set("code", mcpCode);
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error("Error in GitHub callback:", error);
      res.status(500).send("Error processing GitHub callback");
    }
  }

  // Consent confirmation
  protected handleConsentConfirmation(req: Request, res: Response): void {
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
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set("error", "access_denied");
      redirectUrl.searchParams.set("error_description", "The user denied the authorization request");
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }
      res.redirect(redirectUrl.toString());
      return;
    }

    const code = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const client = this.getClient(client_id);
    client.authorization_code = {
      code,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      expires_at: Date.now() + 600000,
    };
    this.setClient(client_id, client);

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }
    res.redirect(redirectUrl.toString());
  }

  // CORS options handler
  private handleCorsOptions = (req: Request, res: Response): void => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).end();
  };
}