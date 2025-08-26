"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CalendarIcon,
  CheckSquareIcon,
  BarChartIcon,
  AlertCircle,
} from "lucide-react"
import { getCalendarEvents } from "@/services/google-calendar"
import { checkUserIntegrations } from "@/services/auth-service"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { calendar_v3 } from "googleapis"
import Link from "next/link"

// Type that matches what Google Calendar API returns
type GoogleCalendarEvent = calendar_v3.Schema$Event

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<{
    hasAnyIntegration: boolean
    services: { google: boolean }
  } | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (status !== "authenticated" || !session) {
        setIsLoading(false)
        return
      }

      console.log("session", (session as any).accessToken)

      try {
        setIsLoading(true)

        // Check for integrations
        const userIntegrations = await checkUserIntegrations(
          session.user?.id || ""
        )
        setIntegrations(userIntegrations)

        // Only fetch calendar events if Google is integrated
        if (userIntegrations.services.google) {
          // Get 7 days before and after today
          const timeMin = new Date()
          timeMin.setDate(timeMin.getDate() - 7)

          const timeMax = new Date()
          timeMax.setDate(timeMax.getDate() + 7)

          // Get events directly from the Google Calendar service
          const calendarEvents = await getCalendarEvents(
            session,
            timeMin.toISOString(),
            timeMax.toISOString(),
            10
          )

          setEvents(calendarEvents)
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [session, status])

  // Format date to display in a readable format
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "No date"
    const date = new Date(dateString)
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {!isLoading && integrations && !integrations.hasAnyIntegration && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No integrations found</AlertTitle>
          <AlertDescription>
            To get the most out of Terapotik, you need to integrate your
            accounts.
            <div className="mt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/integrations">Set up integrations</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Events
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading events...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : !integrations?.services.google ? (
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to see events
              </p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events
              </p>
            ) : (
              <ul className="space-y-2">
                {events.slice(0, 5).map((event) => (
                  <li key={event.id} className="text-sm">
                    <div className="font-medium">{event.summary}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.start?.dateTime || event.start?.date)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Tasks</CardTitle>
            <CheckSquareIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tasks...</p>
            ) : !integrations?.services.google ? (
              <p className="text-sm text-muted-foreground">
                Connect your Google account to see tasks
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tasks will appear here
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your recent activity will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
