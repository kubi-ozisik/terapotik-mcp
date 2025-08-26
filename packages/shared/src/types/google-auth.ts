// src/types/google-auth.ts

import { google } from "googleapis";

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleAuthToken {
  access_token: string;
  refresh_token?: string | null;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface GoogleAuthClientWithToken {
  client: InstanceType<typeof google.auth.OAuth2>;
  token: GoogleAuthToken;
}
