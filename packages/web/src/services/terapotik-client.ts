"use server"

import { auth } from "@/auth"

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001") + "/api"

/**
 * Base function to make authenticated requests to the Terapotik API
 */
async function terapotikApiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  // Get the session to access the token
  const session = await auth()
  const accessToken = (session as any)?.accessToken

  if (!accessToken) {
    throw new Error("No access token available. Please log in with Auth0.")
  }

  // Prepare headers with authentication
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      next: { revalidate: 0 }, // Disable caching for these requests
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData?.message || "Unknown error"
        }`
      )
    }

    return response.json()
  } catch (error) {
    console.error(`Error in Terapotik API request to ${endpoint}:`, error)
    throw error
  }
}

/* User endpoints */

/**
 * Fetches the current user's information from the Terapotik API
 */
export async function getTerapotikUserData() {
  return terapotikApiRequest("/api/me")
}

/**
 * Updates the current user's information
 */
export async function updateUserProfile(userData: any) {
  return terapotikApiRequest("/me", {
    method: "PUT",
    body: JSON.stringify(userData),
  })
}

/* Task endpoints */

/**
 * Fetches all task lists for the current user
 */
export async function getTaskLists() {
  return terapotikApiRequest("/tasks/lists")
}

/**
 * Fetches all tasks for the current user from all lists
 */
export async function getTasks() {
  return terapotikApiRequest("/tasks/all")
}

/**
 * Fetches tasks from a specific task list
 */
export async function getTasksFromList(taskListId: string) {
  // URL encode the taskListId as it may contain special characters
  const encodedTaskListId = encodeURIComponent(taskListId)

  return terapotikApiRequest(`/tasks/${encodedTaskListId}/tasks`)
}

/**
 * Creates a new task in a specific task list
 */
export async function createTaskInList(taskListId: string, taskData: any) {
  return terapotikApiRequest(`/tasks/${taskListId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ task: taskData }),
  })
}

/**
 * Gets a single task by ID
 */
export async function getTask(taskId: string) {
  return terapotikApiRequest(`/tasks/${taskId}`)
}

/**
 * Creates a new task
 */
export async function createTask(taskData: any) {
  return terapotikApiRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  })
}

/**
 * Updates an existing task
 */
export async function updateTask(taskId: string, taskData: any) {
  return terapotikApiRequest(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(taskData),
  })
}

/**
 * Deletes a task
 */
export async function deleteTask(taskId: string) {
  return terapotikApiRequest(`/tasks/${taskId}`, {
    method: "DELETE",
  })
}

/**
 * Updates a task in a specific list
 */
export async function updateTaskInList(
  taskListId: string,
  taskId: string,
  taskData: any
) {
  const encodedTaskListId = encodeURIComponent(taskListId)
  const encodedTaskId = encodeURIComponent(taskId)

  return terapotikApiRequest(
    `/tasks/${encodedTaskListId}/tasks/${encodedTaskId}`,
    {
      method: "PUT",
      body: JSON.stringify({ task: taskData }),
    }
  )
}

/**
 * Updates a task's status (complete/incomplete)
 */
export async function updateTaskStatus(
  taskListId: string,
  taskId: string,
  completed: boolean
) {
  const encodedTaskListId = encodeURIComponent(taskListId)
  const encodedTaskId = encodeURIComponent(taskId)

  return terapotikApiRequest(
    `/tasks/${encodedTaskListId}/tasks/${encodedTaskId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        task: {
          status: completed ? "completed" : "needsAction",
        },
      }),
    }
  )
}

/**
 * Deletes a task from a specific list
 */
export async function deleteTaskFromList(taskListId: string, taskId: string) {
  const encodedTaskListId = encodeURIComponent(taskListId)
  const encodedTaskId = encodeURIComponent(taskId)

  return terapotikApiRequest(
    `/tasks/${encodedTaskListId}/tasks/${encodedTaskId}`,
    {
      method: "DELETE",
    }
  )
}

/* Auth helpers */

/**
 * For client components that need to use the token directly
 * This is a workaround and should be used carefully
 */
export async function getTerapotikToken() {
  const session = await auth()
  return (session as any)?.accessToken
}

/**
 * Helper for client components to make API requests
 * @param endpoint - API endpoint to call (e.g. "/me")
 * @param token - Auth0 access token
 * @param options - Fetch options
 */
export async function callTerapotikApi(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  if (!token) {
    throw new Error("No token provided")
  }

  // Prepare headers with authentication
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData?.message || "Unknown error"
        }`
      )
    }

    return response.json()
  } catch (error) {
    console.error(`Error in Terapotik API request to ${endpoint}:`, error)
    throw error
  }
}

/* Calendar endpoints */

/**
 * Fetches the user's calendar list
 */
export async function getCalendarList() {
  return terapotikApiRequest("/calendar/list")
}

/**
 * Fetches events for a specific date
 * @param date Date in YYYY-MM-DD format
 */
export async function getEventsForDate(date: string) {
  return terapotikApiRequest(`/calendar/events/date/${date}`)
}

/**
 * Fetches events for a date range
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @param calendarId Optional calendar ID (defaults to primary)
 */
export async function getEventsForDateRange(
  startDate: string,
  endDate: string,
  calendarId?: string
) {
  let url = `/calendar/events/range?startDate=${startDate}&endDate=${endDate}`
  if (calendarId) {
    url += `&calendarId=${encodeURIComponent(calendarId)}`
  }
  return terapotikApiRequest(url)
}

/**
 * Fetches all events with optional parameters
 * @param params Optional parameters for the request
 */
export async function getCalendarEvents(
  params: {
    calendarId?: string
    timeMin?: string
    timeMax?: string
    maxResults?: number
  } = {}
) {
  const queryParams = new URLSearchParams()

  if (params.calendarId) {
    queryParams.append("calendarId", params.calendarId)
  }
  if (params.timeMin) {
    queryParams.append("timeMin", params.timeMin)
  }
  if (params.timeMax) {
    queryParams.append("timeMax", params.timeMax)
  }
  if (params.maxResults) {
    queryParams.append("maxResults", params.maxResults.toString())
  }

  const queryString = queryParams.toString()
  const url = queryString
    ? `/calendar/events?${queryString}`
    : "/calendar/events"

  return terapotikApiRequest(url)
}

/**
 * Creates a new calendar event
 * @param eventData Event data
 * @param calendarId Optional calendar ID (defaults to primary)
 */
export async function createCalendarEvent(eventData: any, calendarId?: string) {
  return terapotikApiRequest("/calendar/events", {
    method: "POST",
    body: JSON.stringify({
      event: eventData,
      calendarId,
    }),
  })
}

/**
 * Creates a recurring calendar event
 * @param eventData Event data
 * @param recurrence Recurrence rule
 * @param calendarId Optional calendar ID (defaults to primary)
 */
export async function createRecurringEvent(
  eventData: any,
  recurrence: any,
  calendarId?: string
) {
  return terapotikApiRequest("/calendar/events/recurring", {
    method: "POST",
    body: JSON.stringify({
      event: eventData,
      recurrence,
      calendarId,
    }),
  })
}

/**
 * Updates an existing calendar event
 * @param eventId Event ID
 * @param eventData Updated event data
 * @param calendarId Optional calendar ID (defaults to primary)
 */
export async function updateCalendarEvent(
  eventId: string,
  eventData: any,
  calendarId?: string
) {
  return terapotikApiRequest(`/calendar/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify({
      event: eventData,
      calendarId,
    }),
  })
}

/**
 * Deletes a calendar event
 * @param eventId Event ID
 * @param calendarId Optional calendar ID (defaults to primary)
 */
export async function deleteCalendarEvent(
  eventId: string,
  calendarId?: string
) {
  let url = `/calendar/events/${eventId}`
  if (calendarId) {
    url += `?calendarId=${encodeURIComponent(calendarId)}`
  }

  return terapotikApiRequest(url, {
    method: "DELETE",
  })
}
