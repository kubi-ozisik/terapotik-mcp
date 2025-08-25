import type { NextAuthConfig } from "next-auth"
import Auth0 from "next-auth/providers/auth0"

// Print environment variables for debugging during build
console.log("[Auth0 Config Check]", {
  hasClientId: !!process.env.AUTH0_CLIENT_ID,
  hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
  hasIssuer: !!process.env.AUTH0_ISSUER,
  hasAudience: !!process.env.AUTH0_AUDIENCE,
  baseUrl: process.env.NEXTAUTH_URL || "missing",
})

// Determine the base URL for the callback - DO NOT HARDCODE PORT
const baseUrl = process.env.NEXTAUTH_URL
const callbackUrl = `${baseUrl}/api/auth/callback/auth0`

export default {
  providers: [
    Auth0({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER!,
      authorization: {
        params: {
          scope: "openid profile email offline_access",
          audience: process.env.AUTH0_AUDIENCE || "https://api.terapotik.com",
          response_type: "code",
          redirect_uri: callbackUrl,
        },
      },
      profile(profile, tokens) {
        console.log("AUTH0 PROFILE CALLBACK - TOKEN INFO:", {
          hasAccessToken: !!tokens.access_token,
          accessTokenPrefix: tokens.access_token
            ? tokens.access_token.substring(0, 15) + "..."
            : "NONE",
          hasIdToken: !!tokens.id_token,
          idTokenPrefix: tokens.id_token
            ? tokens.id_token.substring(0, 15) + "..."
            : "NONE",
        })

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //   authorization: {
    //     params: {
    //       scope: [
    //         "openid",
    //         "https://www.googleapis.com/auth/userinfo.email",
    //         "https://www.googleapis.com/auth/userinfo.profile",
    //         "https://www.googleapis.com/auth/calendar",
    //         "https://www.googleapis.com/auth/tasks",
    //       ].join(" "),
    //       prompt: "consent",
    //       access_type: "offline",
    //       response_type: "code",
    //     },
    //   },
    // }),
  ],
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig
