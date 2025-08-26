import { prisma } from "@terapotik/shared"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=missing_params`
    )
  }

  try {
    // Decode the state to get userId
    const stateData = JSON.parse(Buffer.from(state, "base64").toString())
    const { userId } = stateData

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/connect/google/callback`,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error)
    }

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    )

    const userInfo = await userInfoResponse.json()

    // Store the tokens in ServiceToken collection instead of Account
    await prisma.serviceToken.upsert({
      where: {
        userId_service: {
          userId: userId,
          service: "google",
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope,
      },
      create: {
        userId: userId,
        service: "google",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope,
      },
    })

    // Redirect back to integrations page
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?connected=google`
    )
  } catch (error) {
    console.error("Error in Google callback:", error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=auth_failed`
    )
  }
}
