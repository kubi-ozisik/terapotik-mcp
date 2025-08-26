import { prisma } from "@terapotik/shared"
import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth, { Session } from "next-auth"
import { JWT } from "next-auth/jwt"
import authConfig from "./config/auth.config"
import { syncUserToDB } from "./services/auth-service"

// Extend the existing Session type
interface ExtendedSession extends Session {
  accessToken?: string
  idToken?: string
  provider?: string
}

// Extend the JWT type
interface ExtendedToken extends JWT {
  accessToken?: string
  idToken?: string
  provider?: string
}

// Get trusted hosts from environment variable
// const trustedHosts = process.env.AUTH_TRUSTED_HOST?.split(",") || []

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  // Add secret for token encryption
  secret:
    process.env.AUTH_SECRET || "fallback-dev-secret-do-not-use-in-production",
  // Add trusted hosts configuration - force trust all hosts to fix Docker deployment
  trustHost: true, // process.env.NODE_ENV === "production",
  // Add URL configuration
  basePath: "/api/auth",
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/error",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in - capture the tokens from the account object
      if (account && user) {
        console.log("JWT CALLBACK - ACCOUNT DATA:", {
          provider: account.provider,
          accessToken: account.access_token
            ? `${account.access_token.substring(0, 10)}...`
            : "NONE",
          tokenType: account.token_type,
          scope: account.scope,
        })

        // Add ID and tokens to JWT when account and user are available
        token.id = user.id
        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.provider = account.provider

        // Sync Auth0 user to database to ensure we have their authId saved
        await syncUserToDB(token)
      }

      return token as ExtendedToken
    },
    async session({ session, token }) {
      // Add properties to session
      if (token) {
        console.log("SESSION CALLBACK - TOKEN DATA:", {
          hasAccessToken: !!token.accessToken,
          accessTokenPrefix: token.accessToken
            ? `${String(token.accessToken).substring(0, 10)}...`
            : "NONE",
          provider: token.provider,
        })

        session.user.id = token.id as string
        ;(session as ExtendedSession).accessToken = token.accessToken as
          | string
          | undefined
        ;(session as ExtendedSession).idToken = token.idToken as
          | string
          | undefined
        ;(session as ExtendedSession).provider = token.provider as
          | string
          | undefined
      }

      return session as ExtendedSession
    },
  },
})
