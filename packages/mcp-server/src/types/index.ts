import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Define JWTPayload interface to replace the one from jose
export interface JWTPayload {
  [key: string]: any;
}

// Define JWK interface that's compatible with what openid-client expects
export interface JWK {
  kty: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  x5u?: string;
  x5c?: string[];
  x5t?: string;
  "x5t#S256"?: string;
  [key: string]: unknown;
}

export type UserProps = {
  claims: JWTPayload;
  tokenSet: {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    accessTokenTTL?: number;
  };
};

export type AuthRequest = {
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  responseType: string;
};

export type Auth0AuthRequest = {
  mcpAuthRequest: AuthRequest;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  transactionState: string;
  consentToken: string;
};

// Define environment interface
export interface Env {
  PORT?: string;
  NODE_ENV?: string;
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
  BASE_URL?: string;
}

export interface SessionData {
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