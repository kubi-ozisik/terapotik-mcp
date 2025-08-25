"use server"

import { prisma } from "@terapotik/shared"
import { JWT } from "next-auth/jwt"

/**
 * Syncs the Auth0 user to our database
 * Called during the JWT and session callbacks
 */
export async function syncUserToDB(token: JWT) {
  try {
    // Extract the user ID (Auth0 sub) from the token
    const authId = token.sub
    const email = token.email as string

    if (!authId) {
      console.error("No auth ID (sub) found in token")
      return null
    }

    // First check if a user with this email or authId already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authId: authId },
          { email: email && email.length > 0 ? email : undefined },
        ],
      },
    })

    if (existingUser) {
      // User exists, ensure the authId is set and update information
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          authId: authId, // Ensure authId is set correctly
          name: (token.name as string) || existingUser.name,
          email: email || existingUser.email,
          image: (token.picture as string) || existingUser.image,
        },
      })
    } else {
      // No existing user found, create a new one
      return await prisma.user.create({
        data: {
          authId: authId,
          name: (token.name as string) || "User",
          email: email || "",
          image: (token.picture as string) || null,
        },
      })
    }
  } catch (error) {
    console.error("Error syncing user to database:", error)
    throw error
  }
}

/**
 * Fetches a user by their Auth0 sub ID
 */
export async function getUserByAuthId(authId: string) {
  return prisma.user.findFirst({
    where: { authId },
  })
}

/**
 * Gets a user's service tokens by their user ID
 */
export async function getUserServiceTokens(userId: string) {
  return prisma.serviceToken.findMany({
    where: { userId },
  })
}

/**
 * Associates user's Google account with their Auth0 account
 */
export async function linkGoogleAccount(userId: string, googleData: any) {
  try {
    // Check if user already has a Google account linked
    const existingLink = await prisma.serviceToken.findFirst({
      where: {
        userId: userId,
        service: "google",
      },
    })

    if (existingLink) {
      // Update existing link
      return prisma.serviceToken.update({
        where: { id: existingLink.id },
        data: {
          accessToken: googleData.access_token,
          refreshToken: googleData.refresh_token || existingLink.refreshToken,
          expiresAt: googleData.expires_at
            ? new Date(googleData.expires_at * 1000)
            : null,
          scope: googleData.scope || existingLink.scope,
        },
      })
    } else {
      // Create new link
      return prisma.serviceToken.create({
        data: {
          userId: userId,
          service: "google",
          accessToken: googleData.access_token,
          refreshToken: googleData.refresh_token,
          expiresAt: googleData.expires_at
            ? new Date(googleData.expires_at * 1000)
            : null,
          scope: googleData.scope,
        },
      })
    }
  } catch (error) {
    console.error("Error linking Google account:", error)
    throw error
  }
}

/**
 * Checks if a user has any service integrations
 * @param userId The user's ID
 * @returns An object containing integration status for each service
 */
export async function checkUserIntegrations(userId: string) {
  try {
    const serviceTokens = await prisma.serviceToken.findMany({
      where: { userId },
      select: {
        service: true,
        scope: true,
        expiresAt: true,
      },
    })

    const now = Date.now()

    // Check if tokens are valid (not expired)
    const validServiceTokens = serviceTokens.filter((token) => {
      // If token has no expiry or expiry is in the future, it's valid
      return !token.expiresAt || new Date(token.expiresAt).getTime() > now
    })

    // Find the Google token if it exists
    const googleToken = validServiceTokens.find(
      (token) => token.service === "google"
    )
    const hasGoogleService = !!googleToken

    // Check for specific services based on scopes
    const hasCalendarScope =
      hasGoogleService &&
      googleToken.scope?.includes("https://www.googleapis.com/auth/calendar")

    const hasTasksScope =
      hasGoogleService &&
      googleToken.scope?.includes("https://www.googleapis.com/auth/tasks")

    // Create a map of service integrations, ONLY checking ServiceToken for calendar and tasks
    const integrations = {
      hasAnyIntegration: validServiceTokens.length > 0,
      services: {
        google: hasGoogleService,
        calendar: hasCalendarScope || false,
        tasks: hasTasksScope || false,
      },
    }

    return integrations
  } catch (error) {
    console.error("Error checking user integrations:", error)
    return {
      hasAnyIntegration: false,
      services: {
        google: false,
        calendar: false,
        tasks: false,
      },
    }
  }
}
