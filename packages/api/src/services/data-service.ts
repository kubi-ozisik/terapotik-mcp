import express, { Request, Response, Router } from "express";

import { prisma } from "@terapotik/shared";
import { GoogleAuthToken } from "@terapotik/shared/types";
import { isTokenExpired, refreshGoogleTokens } from "../utils/google-auth";

export interface AuthenticatedRequest extends Request {
    auth: {
      payload: {
        sub: string;
        iss: string;
        aud: string | string[];
        iat: number;
        exp: number;
        scope?: string;
        [key: string]: any;
      };
      header: {
        alg: string;
        typ: string;
        kid: string;
      };
      token: string;
    };
  }

  /**
 * Helper function to get Google tokens for a user with automatic refresh
 */
export async function getGoogleTokenForUserWithRefresh(req: AuthenticatedRequest): Promise<GoogleAuthToken> {
  // Get the Auth0 user ID from the JWT token
  const auth = (req as AuthenticatedRequest).auth;

  if (!auth || !auth.payload || !auth.payload.sub) {
    throw new Error("No authenticated user found in request");
  }

  const userId = auth.payload.sub;
  console.log("Looking for user with Auth0 ID:", userId);

  // Try to find the user by Auth0 ID
  let user = await prisma.user.findFirst({
    where: { authId: userId },
  });

  // If not found, try to find via Account.providerAccountId
  if (!user) {
    console.log("User not found by authId, trying to find via Account...");

    const account = await prisma.account.findFirst({
      where: {
        providerAccountId: userId,
      },
      include: {
        user: true,
      },
    });

    if (account?.user) {
      user = account.user;
      console.log("Found user via Account:", user.id);

      // Update the user's authId for future lookups
      await prisma.user.update({
        where: { id: user.id },
        data: { authId: userId },
      });
      console.log("Updated user authId to:", userId);
    }
  }

  if (!user) {
    throw new Error(`User not found with Auth0 ID: ${userId}`);
  }

  // Find the user's Google service token
  const serviceToken = await prisma.serviceToken.findFirst({
    where: {
      userId: user.id,
      service: "google",
    },
  });

  if (!serviceToken || !serviceToken.accessToken) {
    throw new Error("No Google service token found for this user");
  }

  let tokens: GoogleAuthToken = {
    access_token: serviceToken.accessToken,
    refresh_token: serviceToken.refreshToken || undefined,
    scope: serviceToken.scope || "",
    token_type: "Bearer",
    expiry_date: serviceToken.expiresAt ? serviceToken.expiresAt.getTime() : 0,
  };

  // Check if token needs refresh
  if (isTokenExpired(tokens.expiry_date) && tokens.refresh_token) {
    console.log("Token expired, refreshing automatically...");
    try {
      tokens = await refreshGoogleTokens(user.id, tokens.refresh_token);
    } catch (error) {
      console.error("Automatic token refresh failed:", error);
      throw new Error("Google Calendar access expired. Please login to Terapotik web app to integrate your Google Calendar again.");
    }
  }

  return tokens;
}

// /**
//  * Helper function to get Google tokens for a user from the ServiceToken collection
//  */
// export async function getGoogleTokenForUser(req: AuthenticatedRequest): Promise<GoogleAuthToken> {
//   // Get the Auth0 user ID from the JWT token
//   const auth = (req as AuthenticatedRequest).auth;

//   if (!auth || !auth.payload || !auth.payload.sub) {
//     throw new Error("No authenticated user found in request");
//   }

//   const userId = auth.payload.sub;
//   console.log("Looking for user with Auth0 ID:", userId);

//   // Try to find the user by Auth0 ID
//   let user = await prisma.user.findFirst({
//     where: { authId: userId },
//   });

//   // If not found, try to find via Account.providerAccountId
//   if (!user) {
//     console.log("User not found by authId, trying to find via Account...");

//     const account = await prisma.account.findFirst({
//       where: {
//         providerAccountId: userId,
//       },
//       include: {
//         user: true,
//       },
//     });

//     if (account?.user) {
//       user = account.user;
//       console.log("Found user via Account:", user.id);

//       // Update the user's authId for future lookups
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { authId: userId },
//       });
//       console.log("Updated user authId to:", userId);
//     }
//   }

//   if (!user) {
//     throw new Error(`User not found with Auth0 ID: ${userId}`);
//   }

//   // Find the user's Google service token
//   const serviceToken = await prisma.serviceToken.findFirst({
//     where: {
//       userId: user.id,
//       service: "google",
//     },
//   });

//   if (!serviceToken || !serviceToken.accessToken) {
//     throw new Error("No Google service token found for this user");
//   }

//   return {
//     access_token: serviceToken.accessToken,
//     refresh_token: serviceToken.refreshToken || undefined,
//     scope: serviceToken.scope || "",
//     token_type: "Bearer",
//     expiry_date: serviceToken.expiresAt ? serviceToken.expiresAt.getTime() : 0,
//   };
// }