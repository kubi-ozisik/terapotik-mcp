import { auth } from "@/auth"
import { checkUserIntegrations } from "@/services/auth-service"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Use the existing checkUserIntegrations method
    const integrations = await checkUserIntegrations(session.user.id)

    const connectedAccounts = {
      google: {
        connected: integrations.services.google,
      },
      calendar: {
        connected: integrations.services.calendar,
      },
      tasks: {
        connected: integrations.services.tasks,
      },
    }

    return NextResponse.json(connectedAccounts)
  } catch (error) {
    console.error("Error checking connected accounts:", error)
    return NextResponse.json(
      { error: "Failed to check accounts" },
      { status: 500 }
    )
  }
}
