import { google } from "googleapis"
import { Session } from "next-auth"
import { prisma } from "@terapotik/shared"

export interface GoogleTask {
  id: string
  title?: string | null | undefined
  notes?: string | null
  status?: "needsAction" | "completed" | null | undefined | any
  due?: string | null
  completed?: string | null
  parent?: string | null
  position?: string | null
}

export interface GoogleTaskList {
  id?: string | null
  title?: string | null | undefined
  updated?: string | null
}

async function getGoogleTasksClient(session: Session) {
  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  // Get token from ServiceToken collection
  const serviceToken = await prisma.serviceToken.findFirst({
    where: {
      userId: session.user.id,
      service: "google",
    },
  })

  if (!serviceToken?.accessToken) {
    throw new Error("Google account not connected")
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + "/api/auth/callback/google"
  )

  oauth2Client.setCredentials({
    access_token: serviceToken.accessToken,
    refresh_token: serviceToken.refreshToken || undefined,
  })

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.serviceToken.update({
        where: { id: serviceToken.id },
        data: {
          accessToken: tokens.access_token as string,
          ...(tokens.refresh_token
            ? { refreshToken: tokens.refresh_token as string }
            : {}),
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      })
    } else if (tokens.access_token) {
      // Just update the access token if no refresh token
      await prisma.serviceToken.update({
        where: { id: serviceToken.id },
        data: {
          accessToken: tokens.access_token as string,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      })
    }
  })

  return google.tasks({ version: "v1", auth: oauth2Client })
}

// Task List Management
export async function getTaskLists(session: Session) {
  try {
    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasklists.list({})

    return response.data.items || []
  } catch (error) {
    console.error("Error fetching task lists:", error)
    throw error
  }
}

export async function createTaskList(session: Session, title: string) {
  try {
    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasklists.insert({
      requestBody: {
        title: title,
      },
    })

    return response.data
  } catch (error) {
    console.error("Error creating task list:", error)
    throw error
  }
}

export async function updateTaskList(
  session: Session,
  taskListId: string,
  title: string
) {
  try {
    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasklists.update({
      tasklist: taskListId,
      requestBody: {
        title: title,
      },
    })

    return response.data
  } catch (error) {
    console.error("Error updating task list:", error)
    throw error
  }
}

export async function deleteTaskList(session: Session, taskListId: string) {
  try {
    const tasks = await getGoogleTasksClient(session)

    await tasks.tasklists.delete({
      tasklist: taskListId,
    })

    return true
  } catch (error) {
    console.error("Error deleting task list:", error)
    throw error
  }
}

// Task Management
export async function getTasks(
  session: Session,
  taskListId: string,
  maxResults: number = 100
) {
  try {
    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasks.list({
      tasklist: taskListId,
      maxResults: maxResults,
      showCompleted: true,
    })

    return response.data.items || []
  } catch (error) {
    console.error("Error fetching tasks:", error)
    throw error
  }
}

export async function createTask(
  session: Session,
  taskListId: string,
  task: Omit<GoogleTask, "id">
) {
  try {
    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: {
        title: task.title,
        notes: task.notes,
        due: task.due,
        parent: task.parent,
        position: task.position,
      },
    })

    return response.data
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

export async function updateTask(
  session: Session,
  taskListId: string,
  taskId: string,
  task: Partial<GoogleTask>
) {
  try {
    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasks.update({
      tasklist: taskListId,
      task: taskId,
      requestBody: task,
    })

    return response.data
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function deleteTask(
  session: Session,
  taskListId: string,
  taskId: string
) {
  try {
    const tasks = await getGoogleTasksClient(session)

    await tasks.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    })

    return true
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

export async function completeTask(
  session: Session,
  taskListId: string,
  taskId: string
) {
  try {
    // Validate parameters
    if (!taskListId) {
      throw new Error("Task list ID is required")
    }

    if (!taskId) {
      throw new Error("Task ID is required")
    }

    console.log("Completing task:", { taskListId, taskId })

    const tasks = await getGoogleTasksClient(session)

    const response = await tasks.tasks.update({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        id: taskId, // Explicitly include the task ID in the request body
        status: "completed",
      },
    })

    return response.data
  } catch (error: any) {
    console.error("Error completing task:", error)
    // Check for specific Google API errors
    if (error.response?.data?.error) {
      console.error("Google API error:", error.response.data.error)
    }
    throw error
  }
}

// Helper function to check if Google Tasks API is enabled
export async function checkGoogleTasksAccess(
  session: Session
): Promise<boolean> {
  try {
    await getTaskLists(session)
    return true
  } catch (error) {
    return false
  }
}
