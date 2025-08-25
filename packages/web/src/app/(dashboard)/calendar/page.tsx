"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  PlusIcon,
  RefreshCwIcon,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EventDialog } from "@/components/calendar/event-dialog"
import { format, startOfDay, addDays, isToday, isSameDay } from "date-fns"
import {
  getGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/app/actions/calendar"
import { CalendarEvent as GoogleCalendarEvent } from "@/services/google-calendar"
import { calendar_v3 } from "googleapis"

// Type that matches what Google Calendar API returns
type CalendarEvent = {
  id?: string
  summary?: string
  description?: string | undefined
  start?: {
    dateTime?: string
    timeZone?: string | undefined
  }
  end?: {
    dateTime?: string
    timeZone?: string | undefined
  }
  location?: string | undefined
  recurrence?: string[] | undefined
}

export default function CalendarPage() {
  const [date, setDate] = useState(new Date())
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventDialog, setEventDialog] = useState<{
    open: boolean
    event?: CalendarEvent
  }>({ open: false })
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary")

  useEffect(() => {
    checkConnection()
  }, [])

  useEffect(() => {
    if (isConnected) {
      fetchEvents()
    }
  }, [isConnected, date])

  const checkConnection = async () => {
    try {
      const response = await fetch("/api/user/connected-accounts")
      const data = await response.json()
      setIsConnected(data.google?.connected || false)
      if (!data.google?.connected) {
        setEvents([])
      }
    } catch (error) {
      console.error("Error checking connection:", error)
    }
  }

  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Remove date range constraints to fetch all events
      const fetchedEvents = await getGoogleCalendarEvents(
        undefined,
        undefined,
        1000, // Increase max results to fetch more events
        selectedCalendar
      )

      // Map the API response to our local CalendarEvent type
      const mappedEvents: CalendarEvent[] = fetchedEvents.map((event) => ({
        id: event.id || undefined,
        summary: event.summary || undefined,
        description: event.description || undefined,
        start: event.start
          ? {
              dateTime: event.start.dateTime || undefined,
              timeZone: event.start.timeZone || undefined,
            }
          : undefined,
        end: event.end
          ? {
              dateTime: event.end.dateTime || undefined,
              timeZone: event.end.timeZone || undefined,
            }
          : undefined,
        location: event.location || undefined,
        recurrence: event.recurrence || undefined,
      }))

      setEvents(mappedEvents)
    } catch (err) {
      console.error("Error fetching calendar events:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to load calendar events")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvent = async (event: Partial<CalendarEvent>) => {
    try {
      setError(null)
      // Add validation for required fields
      if (!event.summary || !event.start?.dateTime || !event.end?.dateTime) {
        setError("Event requires a title, start time, and end time")
        return
      }

      // Convert to GoogleCalendarEvent for the API
      const googleEvent: GoogleCalendarEvent = {
        summary: event.summary,
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone || undefined,
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone || undefined,
        },
        recurrence: event.recurrence,
      }

      // Pass the selectedCalendar to the function
      await createGoogleCalendarEvent(googleEvent, selectedCalendar)
      fetchEvents()
    } catch (error) {
      console.error("Error creating event:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Failed to create event")
      }
    }
  }

  const handleUpdateEvent = async (
    eventId: string,
    event: Partial<CalendarEvent>
  ) => {
    try {
      setError(null)

      // Convert to GoogleCalendarEvent for the API
      const googleEvent: Partial<GoogleCalendarEvent> = {}

      if (event.summary) googleEvent.summary = event.summary
      if (event.description !== undefined)
        googleEvent.description = event.description
      if (event.location !== undefined) googleEvent.location = event.location
      if (event.recurrence !== undefined)
        googleEvent.recurrence = event.recurrence

      if (event.start?.dateTime) {
        googleEvent.start = {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone || undefined,
        }
      }

      if (event.end?.dateTime) {
        googleEvent.end = {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone || undefined,
        }
      }

      // Pass the selectedCalendar to the function
      await updateGoogleCalendarEvent(eventId, googleEvent, selectedCalendar)
      fetchEvents()
    } catch (error) {
      console.error("Error updating event:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Failed to update event")
      }
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setError(null)
      // Pass the selectedCalendar to the function
      await deleteGoogleCalendarEvent(eventId, selectedCalendar)
      fetchEvents()
    } catch (error) {
      console.error("Error deleting event:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Failed to delete event")
      }
    }
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    if (!event.start?.dateTime) return acc
    const eventDate = new Date(event.start.dateTime)
    const dateKey = format(eventDate, "yyyy-MM-dd")
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/connect/google", {
        method: "POST",
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error connecting Google account:", error)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          {!isConnected ? (
            <Button variant="outline" className="gap-2" onClick={handleConnect}>
              Connect Google Calendar
            </Button>
          ) : (
            <Badge variant="outline" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Google Calendar Connected
            </Badge>
          )}
          <Button
            className="gap-2"
            onClick={() => setEventDialog({ open: true })}
            disabled={!isConnected}
          >
            <PlusIcon className="h-4 w-4" /> New Event
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Calendar view placeholder */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] border rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">
                Calendar component will go here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>This Week's Events</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={fetchEvents}
              disabled={isLoading}
            >
              <RefreshCwIcon
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              {error ? (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <RefreshCwIcon className="h-6 w-6 animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  {!isConnected
                    ? "Connect your Google Calendar to see events"
                    : "No events found for this week"}
                </div>
              ) : (
                Array.from({ length: 7 }).map((_, index) => {
                  const currentDate = addDays(startOfDay(date), index)
                  const dateKey = format(currentDate, "yyyy-MM-dd")
                  const dayEvents = eventsByDate[dateKey] || []

                  return (
                    <div key={dateKey} className="mb-6">
                      <div
                        className={`font-medium text-sm ${
                          isToday(currentDate)
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(currentDate, "EEEE, MMMM d")}
                      </div>
                      {dayEvents.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">
                          No events
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-2 p-2 rounded hover:bg-muted"
                            >
                              <div className="h-2 w-2 mt-2 rounded-full bg-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium truncate">
                                    {event.summary}
                                    {event.recurrence && (
                                      <Badge
                                        variant="outline"
                                        className="ml-2 text-xs"
                                      >
                                        Recurring
                                      </Badge>
                                    )}
                                  </p>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setEventDialog({ open: true, event })
                                        }
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() =>
                                          event.id &&
                                          handleDeleteEvent(event.id)
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                {event.start?.dateTime && (
                                  <p className="text-sm text-muted-foreground">
                                    {format(
                                      new Date(event.start.dateTime),
                                      "h:mm a"
                                    )}
                                    {event.end?.dateTime &&
                                      ` - ${format(
                                        new Date(event.end.dateTime),
                                        "h:mm a"
                                      )}`}
                                  </p>
                                )}
                                {event.location && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {event.location}
                                  </p>
                                )}
                                {event.recurrence && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {event.recurrence[0].includes("DAILY") &&
                                      "Repeats daily"}
                                    {event.recurrence[0].includes("WEEKLY") &&
                                      "Repeats weekly"}
                                    {event.recurrence[0].includes("MONTHLY") &&
                                      "Repeats monthly"}
                                    {event.recurrence[0].match(/COUNT=(\d+)/) &&
                                      ` for ${
                                        event.recurrence[0].match(
                                          /COUNT=(\d+)/
                                        )?.[1]
                                      } occurrences`}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <EventDialog
        open={eventDialog.open}
        onOpenChange={(open) => setEventDialog({ open })}
        event={
          eventDialog.event
            ? {
                id: eventDialog.event.id,
                summary: eventDialog.event.summary || "",
                description: eventDialog.event.description,
                start: eventDialog.event.start
                  ? {
                      dateTime: eventDialog.event.start.dateTime || "",
                      timeZone: eventDialog.event.start.timeZone,
                    }
                  : { dateTime: "" },
                end: eventDialog.event.end
                  ? {
                      dateTime: eventDialog.event.end.dateTime || "",
                      timeZone: eventDialog.event.end.timeZone,
                    }
                  : { dateTime: "" },
                location: eventDialog.event.location,
                recurrence: eventDialog.event.recurrence,
              }
            : undefined
        }
        onSave={(event) => {
          if (eventDialog.event?.id) {
            return handleUpdateEvent(eventDialog.event.id, event)
          } else {
            return handleCreateEvent(event)
          }
        }}
      />
    </div>
  )
}
