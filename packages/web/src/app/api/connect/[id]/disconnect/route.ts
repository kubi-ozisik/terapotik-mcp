import { auth } from "@/auth"
import { prisma } from "@terapotik/shared"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    // Map integration IDs to provider names
    const providerMap: Record<string, string> = {
      "google": "google",
      "google-calendar": "google",
      "google-tasks": "google",
    }

    const provider = providerMap[id]
    
    if (!provider) {
      return NextResponse.json(
        { error: "Unknown integration" },
        { status: 400 }
      )
    }

    // Delete the account from the database
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: provider,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting account:", error)
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    )
  }
}
