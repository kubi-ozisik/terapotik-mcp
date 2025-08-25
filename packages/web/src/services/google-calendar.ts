"use server"

import { prisma } from "@terapotik/shared"
import { getUserByAuthId } from "@/services/auth-service"
import { google } from "googleapis"
import { Session } from "next-auth"

// Ensure we're running on server-side only
if (typeof window !== "undefined") {
  throw new Error("This module should only be used on the server side")
}

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: { email: string }[]
  recurrence?: string[]
}

async function getGoogleCalendarClient(session: Session) {
  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  // Get user from Auth0 sub ID if available
  let userId = session.user.id

  // If we have Auth0 sub ID in the extended session, get the user from our database
  const authId = (session as any).sub || (session.user as any).sub
  if (authId) {
    const dbUser = await getUserByAuthId(authId)
    if (dbUser) {
      userId = dbUser.id
    }
  }

  // First try to find the token in ServiceToken collection
  const serviceToken = await prisma.serviceToken.findFirst({
    where: {
      userId: userId,
      service: "google",
    },
  })

  // If not found in ServiceToken, fall back to Account
  if (!serviceToken?.accessToken) {
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "google",
      },
    })

    if (!account?.access_token) {
      throw new Error("Google account not connected")
    }

    // Create the OAuth client with Account token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    )

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    })

    // Handle token refresh
    oauth2Client.on("tokens", async (tokens: any) => {
      if (tokens.refresh_token) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: tokens.access_token,
            expires_at: tokens.expiry_date
              ? Math.floor(tokens.expiry_date / 1000)
              : null,
          },
        })
      }
    })

    return google.calendar({ version: "v3", auth: oauth2Client })
  } else {
    // Use ServiceToken
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    )

    oauth2Client.setCredentials({
      access_token: serviceToken.accessToken,
      refresh_token: serviceToken.refreshToken || undefined,
      expiry_date: serviceToken.expiresAt
        ? serviceToken.expiresAt.getTime()
        : undefined,
    })

    // Handle token refresh
    oauth2Client.on("tokens", async (tokens: any) => {
      if (tokens.access_token) {
        await prisma.serviceToken.update({
          where: { id: serviceToken!.id },
          data: {
            accessToken: tokens.access_token,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          },
        })
      }
    })

    return google.calendar({ version: "v3", auth: oauth2Client })
  }
}

export async function getCalendarEvents(
  session: Session,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50,
  calendarId: string = "primary"
) {
  try {
    const calendar = await getGoogleCalendarClient(session)

    // Do not URL encode 'primary' or email addresses for Google Calendar API
    const calendarIdParam = calendarId

    const response = await calendar.events.list({
      calendarId: calendarIdParam,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax,
      maxResults: maxResults,
      singleEvents: true,
      orderBy: "startTime",
    })

    return response.data.items || []
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    throw error
  }
}

export async function createCalendarEvent(
  session: Session,
  event: CalendarEvent,
  calendarId: string = "primary"
) {
  try {
    const calendar = await getGoogleCalendarClient(session)

    // Do not URL encode 'primary' or email addresses for Google Calendar API
    const calendarIdParam = calendarId

    const response = await calendar.events.insert({
      calendarId: calendarIdParam,
      requestBody: event,
    })

    return response.data
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
}

export async function updateCalendarEvent(
  session: Session,
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId: string = "primary"
) {
  try {
    const calendar = await getGoogleCalendarClient(session)

    // Do not URL encode 'primary' or email addresses for Google Calendar API
    const calendarIdParam = calendarId

    // Always URL encode the eventId to handle special characters
    const encodedEventId = encodeURIComponent(eventId)

    const response = await calendar.events.update({
      calendarId: calendarIdParam,
      eventId: encodedEventId,
      requestBody: event,
    })

    return response.data
  } catch (error) {
    console.error("Error updating calendar event:", error)
    throw error
  }
}

export async function deleteCalendarEvent(
  session: Session,
  eventId: string,
  calendarId: string = "primary"
) {
  try {
    const calendar = await getGoogleCalendarClient(session)

    // Do not URL encode 'primary' or email addresses for Google Calendar API
    const calendarIdParam = calendarId

    // Always URL encode the eventId to handle special characters
    const encodedEventId = encodeURIComponent(eventId)

    await calendar.events.delete({
      calendarId: calendarIdParam,
      eventId: encodedEventId,
    })

    return true
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    throw error
  }
}

// Helper function to check if token is expired
export async function checkIfTokenExpired(session: Session): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user?.id,
      provider: "google",
    },
  })

  if (!account?.expires_at) return false

  return Date.now() > account.expires_at * 1000
}
