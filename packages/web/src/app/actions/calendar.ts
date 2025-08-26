"use server"

import { auth } from "@/auth"
import {
  CalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from "@/services/google-calendar"

export async function getGoogleCalendarEvents(
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50,
  calendarId: string = "primary"
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    const events = await getCalendarEvents(
      session,
      timeMin,
      timeMax,
      maxResults,
      calendarId
    )
    return events
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    throw error
  }
}

export async function createGoogleCalendarEvent(
  event: CalendarEvent,
  calendarId: string = "primary"
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await createCalendarEvent(session, event, calendarId)
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId: string = "primary"
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await updateCalendarEvent(session, eventId, event, calendarId)
  } catch (error) {
    console.error("Error updating calendar event:", error)
    throw error
  }
}

export async function deleteGoogleCalendarEvent(
  eventId: string,
  calendarId: string = "primary"
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await deleteCalendarEvent(session, eventId, calendarId)
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    throw error
  }
}
