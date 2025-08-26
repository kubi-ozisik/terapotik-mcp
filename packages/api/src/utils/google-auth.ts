// src/utils/google-auth.ts

import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import {
  GoogleAuthClientWithToken,
  GoogleAuthToken,
} from "@terapotik/shared/types";
import { prisma } from "@terapotik/shared";

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
 * Check if token is expired or will expire within next 5 minutes
 * @param expiryDate Expiry timestamp in milliseconds
 * @returns boolean
 */
export function isTokenExpired(expiryDate: number): boolean {
  if (!expiryDate) return true;
  const now = Date.now();
  const fiveMinutesFromNow = now + (5 * 60 * 1000); // 5 minutes buffer
  return expiryDate <= fiveMinutesFromNow;
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

/**
 * Create an authenticated Google client with automatic token refresh
 * @param tokens OAuth tokens
 * @param userId User ID for token refresh
 * @returns Authenticated Google client with tokens
 */
export async function createAuthenticatedClientWithRefresh(
  tokens: GoogleAuthToken,
  userId?: string
): Promise<GoogleAuthClientWithToken> {
  const oauth2Client = createGoogleOAuthClient();

  // Check if token needs refresh
  if (isTokenExpired(tokens.expiry_date) && tokens.refresh_token && userId) {
    console.log("Token expired, refreshing...");
    try {
      const refreshedTokens = await refreshGoogleTokens(userId, tokens.refresh_token);
      tokens = refreshedTokens;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw error;
    }
  }

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

/**
 * Refresh Google OAuth tokens and save to database
 * @param userId User ID in database
 * @param refreshToken The refresh token
 * @returns Promise with new tokens
 */
export async function refreshGoogleTokens(
  userId: string, 
  refreshToken: string
): Promise<GoogleAuthToken> {
  console.log(`Refreshing Google tokens for user ${userId}`);
  
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    const newTokens: GoogleAuthToken = {
      access_token: credentials.access_token || "",
      refresh_token: credentials.refresh_token || refreshToken, // Keep old refresh token if new one not provided
      scope: credentials.scope || "",
      token_type: credentials.token_type || "Bearer",
      expiry_date: credentials.expiry_date || 0,
    };

    // Save new tokens to database
    await prisma.serviceToken.update({
      where: {
        userId_service: {
          userId: userId,
          service: "google",
        },
      },
      data: {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        updatedAt: new Date(),
      },
    });

    console.log(`Successfully refreshed tokens for user ${userId}`);
    return newTokens;
  } catch (error) {
    console.error(`Failed to refresh tokens for user ${userId}:`, error);
    throw new Error("Token refresh failed. Please re-authenticate with Google.");
  }
}