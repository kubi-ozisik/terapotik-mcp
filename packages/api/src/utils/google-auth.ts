// src/utils/google-auth.ts

import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import {
  GoogleAuthClientWithToken,
  GoogleAuthToken,
} from "@terapotik/shared/types";

// Load environment variables
dotenv.config();

// Google OAuth scopes
export const GOOGLE_SCOPES = {
  CALENDAR: "https://www.googleapis.com/auth/calendar",
  TASKS: "https://www.googleapis.com/auth/tasks",
};

/**
 * Create a Google OAuth client
 * @returns OAuth2Client
 */
export function createGoogleOAuthClient(): InstanceType<typeof google.auth.OAuth2> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/auth/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth client credentials not found in environment variables. " +
        "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the Google OAuth authentication URL
 * @param scopes Array of Google API scopes
 * @returns Authentication URL for user to authorize
 */
export function generateAuthUrl(scopes: string[]): string {
  const oauth2Client = createGoogleOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
  return url;
}

/**
 * Get OAuth tokens from authorization code
 * @param code The authorization code
 * @returns Promise with OAuth tokens
 */
export async function getTokensFromCode(
  code: string
): Promise<GoogleAuthToken> {
  const oauth2Client = createGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token || "",
    refresh_token: tokens.refresh_token || null,
    scope: tokens.scope || "",
    token_type: tokens.token_type || "Bearer",
    expiry_date: tokens.expiry_date || 0,
  };
}

/**
 * Create an authenticated Google client with tokens
 * @param tokens OAuth tokens
 * @returns Authenticated Google client with tokens
 */
export function createAuthenticatedClient(
  tokens: GoogleAuthToken
): GoogleAuthClientWithToken {
  // Create an OAuth2 client with the required client credentials
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  return {
    client: oauth2Client,
    token: tokens,
  };
}
