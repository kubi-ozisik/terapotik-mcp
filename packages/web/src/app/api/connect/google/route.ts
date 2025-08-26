import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Create a custom OAuth flow for linking accounts
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user?.id,
        action: "link",
      })
    ).toString("base64")

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

    const params = {
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/connect/google/callback`,
      response_type: "code",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/tasks",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: state,
    }

    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value)
    })

    return NextResponse.json({ url: authUrl.toString() })
  } catch (error) {
    console.error("Error creating Google OAuth URL:", error)
    return NextResponse.json(
      { error: "Failed to create OAuth URL" },
      { status: 500 }
    )
  }
}
