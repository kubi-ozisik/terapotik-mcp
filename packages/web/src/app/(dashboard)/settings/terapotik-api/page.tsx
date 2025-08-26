"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  CheckCircle2,
  ServerIcon,
  PlusCircle,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react"
import {
  getTerapotikToken,
  callTerapotikApi,
  getTasks,
  getTaskLists,
  getTasksFromList,
  createTaskInList,
  updateTaskStatus,
  deleteTaskFromList,
  getCalendarList,
  getEventsForDate,
  getEventsForDateRange,
  createCalendarEvent,
  createRecurringEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/services/terapotik-client"
import { useSession } from "next-auth/react"
import { format } from "date-fns"

export default function TerapotikApiPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [taskLists, setTaskLists] = useState<any[]>([])
  const [selectedTaskList, setSelectedTaskList] = useState<string>("")
  const [newTaskTitle, setNewTaskTitle] = useState<string>("")

  // Calendar state
  const [calendars, setCalendars] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary")
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  )
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    ),
  })
  const [newEvent, setNewEvent] = useState({
    summary: "",
    location: "",
    description: "",
    start: {
      dateTime: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })
  const [recurrenceRule, setRecurrenceRule] = useState({
    frequency: "DAILY",
    interval: 1,
    count: 7,
  })

  const testApi = async (endpoint: string) => {
    setLoading(true)
    setError(null)
    setApiResponse(null)

    try {
      // Get token from server action
      const token = await getTerapotikToken()

      if (!token) {
        throw new Error(
          "No access token available. Please make sure you're logged in with Auth0."
        )
      }

      // Store token info for display
      setTokenInfo({
        tokenPrefix: token.substring(0, 10) + "...",
        tokenLength: token.length,
      })

      // Call the API
      const response = await callTerapotikApi(endpoint, token)
      setApiResponse(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("API error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use the terapotik-client to fetch tasks directly
      const response = await getTasks()
      setApiResponse(response)

      // Check if the data structure includes 'taskListsWithTasks'
      if (response?.taskListsWithTasks) {
        setTaskLists(response.taskListsWithTasks || [])
      }

      // Extract all tasks as a flat array for backward compatibility display
      setTasks(response?.data || [])
    } catch (err) {
      console.error("Error fetching tasks:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchTaskLists = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getTaskLists()
      setApiResponse(response)
      setTaskLists(response?.data?.items || [])

      // If we have lists and none selected, select the first one
      if (response?.data?.items?.length > 0 && !selectedTaskList) {
        setSelectedTaskList(response.data.items[0].id)
      }
    } catch (err) {
      console.error("Error fetching task lists:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchTasksFromList = async (taskListId: string) => {
    if (!taskListId) {
      setError("No task list selected")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getTasksFromList(taskListId)
      setApiResponse(response)
      setTasks(response?.data?.items || [])
    } catch (err) {
      console.error(`Error fetching tasks from list ${taskListId}:`, err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    if (!selectedTaskList) {
      setError("No task list selected")
      return
    }

    if (!newTaskTitle.trim()) {
      setError("Task title is required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const taskData = {
        title: newTaskTitle,
        notes: "Created from Terapotik API test page",
        status: "needsAction",
      }

      const response = await createTaskInList(selectedTaskList, taskData)
      setApiResponse(response)

      // Refresh the task list after creating
      await fetchTasksFromList(selectedTaskList)

      // Clear the form
      setNewTaskTitle("")
    } catch (err) {
      console.error("Error creating task:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskStatus = async (
    taskListId: string,
    taskId: string,
    currentStatus: string
  ) => {
    if (!taskListId || !taskId) {
      setError("Task list or task ID is missing")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Toggle the status (completed <-> needsAction)
      const isCompleted = currentStatus === "completed"
      const newStatus = isCompleted ? false : true

      const response = await updateTaskStatus(taskListId, taskId, newStatus)
      setApiResponse(response)

      // Refresh the task list after updating
      await fetchTasksFromList(taskListId)
    } catch (err) {
      console.error("Error updating task status:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (taskListId: string, taskId: string) => {
    if (!taskListId || !taskId) {
      setError("Task list or task ID is missing")
      return
    }

    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await deleteTaskFromList(taskListId, taskId)
      setApiResponse(response)

      // Refresh the task list after deleting
      await fetchTasksFromList(taskListId)
    } catch (err) {
      console.error("Error deleting task:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch the user's calendar list
   */
  const fetchCalendarList = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getCalendarList()
      setApiResponse(response)
      setCalendars(response?.data?.items || [])

      // If we have calendars and none selected, select the primary one
      if (response?.data?.items?.length > 0) {
        const primaryCalendar = response.data.items.find(
          (cal: any) => cal.primary
        )
        if (primaryCalendar) {
          setSelectedCalendar(primaryCalendar.id)
        }
      }
    } catch (err) {
      console.error("Error fetching calendar list:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch events for a specific date
   */
  const fetchEventsForDate = async () => {
    if (!selectedDate) {
      setError("Please select a date")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getEventsForDate(selectedDate)
      setApiResponse(response)
      setEvents(response?.data?.items || [])
    } catch (err) {
      console.error("Error fetching events for date:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch events for a date range
   */
  const fetchEventsForDateRange = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError("Please select both start and end dates")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getEventsForDateRange(
        dateRange.startDate,
        dateRange.endDate,
        selectedCalendar
      )
      setApiResponse(response)
      setEvents(response?.data?.items || [])
    } catch (err) {
      console.error("Error fetching events for date range:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new calendar event
   */
  const handleCreateEvent = async (isRecurring: boolean = false) => {
    if (!newEvent.summary.trim()) {
      setError("Event summary is required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response

      if (isRecurring) {
        response = await createRecurringEvent(
          newEvent,
          recurrenceRule,
          selectedCalendar
        )
      } else {
        response = await createCalendarEvent(newEvent, selectedCalendar)
      }

      setApiResponse(response)

      // Reset event form
      setNewEvent({
        ...newEvent,
        summary: "",
        location: "",
        description: "",
      })

      // Refresh events after creating
      if (dateRange.startDate && dateRange.endDate) {
        await fetchEventsForDateRange()
      }
    } catch (err) {
      console.error("Error creating event:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Delete a calendar event
   */
  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId) {
      setError("Event ID is required")
      return
    }

    if (!confirm("Are you sure you want to delete this event?")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await deleteCalendarEvent(eventId, selectedCalendar)

      // Refresh the events after deleting
      if (dateRange.startDate && dateRange.endDate) {
        await fetchEventsForDateRange()
      } else if (selectedDate) {
        await fetchEventsForDate()
      }
    } catch (err) {
      console.error("Error deleting event:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Terapotik API Settings</h1>

      <Alert className="mb-6">
        <ServerIcon className="h-4 w-4" />
        <AlertTitle>API Connection</AlertTitle>
        <AlertDescription>
          This page allows you to test your Auth0 token with the Terapotik API
          and verify that the integration is working properly.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Auth0 Token Status</CardTitle>
          <CardDescription>
            Verify that your Auth0 token is valid and can be used to access
            Terapotik API resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">
                Login status: <span className="font-medium">{status}</span>
              </p>
              {session && (
                <p className="text-sm">
                  Has token:{" "}
                  <span className="font-medium">
                    {(session as any).accessToken ? "Yes" : "No"}
                  </span>
                </p>
              )}
              {tokenInfo && (
                <div className="mt-4 p-4 bg-slate-50 rounded-md">
                  <p className="text-sm font-medium mb-1">Token Information:</p>
                  <p className="text-sm">
                    Token prefix: {tokenInfo.tokenPrefix}
                  </p>
                  <p className="text-sm">
                    Token length: {tokenInfo.tokenLength} characters
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => testApi("/api/me")}
            disabled={loading || status !== "authenticated"}
          >
            {loading ? "Testing..." : "Test Token"}
          </Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="user">
        <TabsList className="mb-4">
          <TabsTrigger value="user">User Data</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="events">Calendar Events</TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>User API</CardTitle>
              <CardDescription>
                Test the user endpoint to retrieve your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => testApi("/me")} disabled={loading}>
                  {loading ? "Loading..." : "Get User Profile"}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {apiResponse && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">
                      API Response:
                    </h3>
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks API</CardTitle>
              <CardDescription>
                Test Google Tasks integration with the Terapotik API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={fetchTaskLists} disabled={loading}>
                    {loading ? "Loading..." : "Get Task Lists"}
                  </Button>
                  <Button onClick={fetchTasks} disabled={loading}>
                    {loading ? "Loading..." : "Get All Tasks"}
                  </Button>
                </div>

                {taskLists.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Task Lists</h3>
                    <div className="grid gap-2">
                      {taskLists.map((list) => (
                        <div
                          key={list.id}
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div>
                            <p className="font-medium">{list.title}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {list.id}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTaskList(list.id)
                              fetchTasksFromList(list.id)
                            }}
                            disabled={loading}
                          >
                            Get Tasks
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTaskList && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-3">
                      Create a Task in "
                      {taskLists.find((l) => l.id === selectedTaskList)
                        ?.title || "Selected List"}
                      "
                    </h3>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Enter task title"
                        />
                      </div>
                      <Button
                        onClick={createTask}
                        disabled={loading || !newTaskTitle.trim()}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Task
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {apiResponse && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">
                      API Response:
                    </h3>
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>

                    {tasks.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">
                          Tasks ({tasks.length}):
                        </h3>
                        <ul className="space-y-2">
                          {tasks.map((task, index) => (
                            <li
                              key={task.id || index}
                              className="p-3 bg-slate-50 rounded-md"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {task.title ||
                                      task.summary ||
                                      "Unnamed Task"}
                                  </p>
                                  {task.notes && (
                                    <p className="text-sm text-muted-foreground">
                                      {task.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Status: {task.status || "No status"}
                                    {task.due &&
                                      ` • Due: ${new Date(
                                        task.due
                                      ).toLocaleString()}`}
                                  </p>
                                </div>
                                <div className="flex space-x-2 ml-4">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      toggleTaskStatus(
                                        selectedTaskList,
                                        task.id,
                                        task.status
                                      )
                                    }
                                    disabled={loading}
                                    title={
                                      task.status === "completed"
                                        ? "Mark as incomplete"
                                        : "Mark as complete"
                                    }
                                  >
                                    {task.status === "completed" ? (
                                      <CheckSquare className="h-4 w-4" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      deleteTask(selectedTaskList, task.id)
                                    }
                                    disabled={loading}
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Events API</CardTitle>
              <CardDescription>
                Test Google Calendar integration with the Terapotik API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={fetchCalendarList} disabled={loading}>
                    {loading ? "Loading..." : "Get Calendar List"}
                  </Button>
                  <Button
                    onClick={() => fetchEventsForDateRange()}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Get Events (Date Range)"}
                  </Button>
                  <Button
                    onClick={() => fetchEventsForDate()}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Get Events (Single Date)"}
                  </Button>
                </div>

                {calendars.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Calendars</h3>
                    <div className="grid gap-2">
                      {calendars.map((calendar) => (
                        <div
                          key={calendar.id}
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  calendar.backgroundColor || "#4285F4",
                              }}
                            ></div>
                            <div>
                              <p className="font-medium">{calendar.summary}</p>
                              <p className="text-xs text-muted-foreground">
                                {calendar.primary
                                  ? "Primary Calendar"
                                  : "Secondary Calendar"}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setSelectedCalendar(calendar.id)}
                            variant={
                              selectedCalendar === calendar.id
                                ? "default"
                                : "outline"
                            }
                          >
                            {selectedCalendar === calendar.id
                              ? "Selected"
                              : "Select"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-3">
                      Get Events for Single Date
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Date (YYYY-MM-DD):
                        </label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={fetchEventsForDate}
                        disabled={loading || !selectedDate}
                      >
                        Get Events
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-3">
                      Get Events for Date Range
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Start Date:
                        </label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) =>
                            setDateRange({
                              ...dateRange,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          End Date:
                        </label>
                        <Input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) =>
                            setDateRange({
                              ...dateRange,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Button
                        onClick={fetchEventsForDateRange}
                        disabled={
                          loading || !dateRange.startDate || !dateRange.endDate
                        }
                      >
                        Get Events
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedCalendar && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-3">
                      Create New Event in "
                      {calendars.find((c) => c.id === selectedCalendar)
                        ?.summary || "Selected Calendar"}
                      "
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Event Title:
                        </label>
                        <Input
                          value={newEvent.summary}
                          onChange={(e) =>
                            setNewEvent({
                              ...newEvent,
                              summary: e.target.value,
                            })
                          }
                          placeholder="Enter event title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Location:
                        </label>
                        <Input
                          value={newEvent.location}
                          onChange={(e) =>
                            setNewEvent({
                              ...newEvent,
                              location: e.target.value,
                            })
                          }
                          placeholder="Enter location (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Description:
                        </label>
                        <Input
                          value={newEvent.description}
                          onChange={(e) =>
                            setNewEvent({
                              ...newEvent,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter description (optional)"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Start Date & Time:
                          </label>
                          <Input
                            type="datetime-local"
                            value={new Date(newEvent.start.dateTime)
                              .toISOString()
                              .slice(0, 16)}
                            onChange={(e) => {
                              const dateTime = new Date(e.target.value)
                              setNewEvent({
                                ...newEvent,
                                start: {
                                  ...newEvent.start,
                                  dateTime: dateTime.toISOString(),
                                },
                              })
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            End Date & Time:
                          </label>
                          <Input
                            type="datetime-local"
                            value={new Date(newEvent.end.dateTime)
                              .toISOString()
                              .slice(0, 16)}
                            onChange={(e) => {
                              const dateTime = new Date(e.target.value)
                              setNewEvent({
                                ...newEvent,
                                end: {
                                  ...newEvent.end,
                                  dateTime: dateTime.toISOString(),
                                },
                              })
                            }}
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-md font-medium mb-3">
                          Recurrence Options
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Frequency:
                            </label>
                            <select
                              className="w-full rounded-md border border-input py-2"
                              value={recurrenceRule.frequency}
                              onChange={(e) =>
                                setRecurrenceRule({
                                  ...recurrenceRule,
                                  frequency: e.target.value as any,
                                })
                              }
                            >
                              <option value="DAILY">Daily</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="YEARLY">Yearly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Interval:
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={recurrenceRule.interval}
                              onChange={(e) =>
                                setRecurrenceRule({
                                  ...recurrenceRule,
                                  interval: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Count (occurrences):
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={recurrenceRule.count}
                              onChange={(e) =>
                                setRecurrenceRule({
                                  ...recurrenceRule,
                                  count: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCreateEvent(false)}
                          disabled={loading || !newEvent.summary.trim()}
                        >
                          Create Single Event
                        </Button>
                        <Button
                          onClick={() => handleCreateEvent(true)}
                          disabled={loading || !newEvent.summary.trim()}
                          variant="outline"
                        >
                          Create Recurring Event
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {apiResponse && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">
                      API Response:
                    </h3>
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-[400px]">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>

                    {events.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">
                          Events ({events.length}):
                        </h3>
                        <ul className="space-y-2">
                          {events.map((event, index) => (
                            <li
                              key={event.id || index}
                              className="p-3 bg-slate-50 rounded-md"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {event.summary || "Unnamed Event"}
                                  </p>
                                  {event.location && (
                                    <p className="text-sm">
                                      Location: {event.location}
                                    </p>
                                  )}
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {event.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {event.start?.dateTime &&
                                      `${new Date(
                                        event.start.dateTime
                                      ).toLocaleString()}`}
                                    {event.end?.dateTime &&
                                      ` - ${new Date(
                                        event.end.dateTime
                                      ).toLocaleString()}`}
                                  </p>
                                  {event.recurrence && (
                                    <p className="text-xs text-muted-foreground">
                                      Recurring: {event.recurrence.join(", ")}
                                    </p>
                                  )}
                                </div>
                                <div className="flex space-x-2 ml-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteEvent(event.id)}
                                    disabled={loading}
                                    title="Delete event"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
