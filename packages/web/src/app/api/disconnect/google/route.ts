import { auth } from "@/auth"
import { prisma } from "@terapotik/shared"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Delete the Google account from the database
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting Google account:", error)
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    )
  }
}
