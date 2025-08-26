"use server"

import { auth } from "@/auth"
import {
  completeTask,
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  getTaskLists,
  getTasks,
  GoogleTask,
  GoogleTaskList,
  updateTask,
  updateTaskList,
} from "@/services/google-tasks"

// Task Lists
export async function getGoogleTaskLists(): Promise<GoogleTaskList[]> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    const taskLists = await getTaskLists(session)
    return taskLists
  } catch (error) {
    console.error("Error fetching task lists:", error)
    throw error
  }
}

export async function createGoogleTaskList(title: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await createTaskList(session, title)
  } catch (error) {
    console.error("Error creating task list:", error)
    throw error
  }
}

export async function updateGoogleTaskList(
  taskListId: string,
  title: string
): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await updateTaskList(session, taskListId, title)
  } catch (error) {
    console.error("Error updating task list:", error)
    throw error
  }
}

export async function deleteGoogleTaskList(taskListId: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await deleteTaskList(session, taskListId)
  } catch (error) {
    console.error("Error deleting task list:", error)
    throw error
  }
}

// Tasks
export async function getGoogleTasks(
  taskListId: string
): Promise<GoogleTask[]> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    const tasks = await getTasks(session, taskListId)
    // Ensure all tasks have required fields for GoogleTask type
    return tasks.map((task) => ({
      id: task.id || "",
      title: task.title,
      notes: task.notes,
      status: task.status,
      due: task.due,
      completed: task.completed,
      parent: task.parent,
      position: task.position,
    }))
  } catch (error) {
    console.error("Error fetching tasks:", error)
    throw error
  }
}

export async function createGoogleTask(
  taskListId: string,
  task: Omit<GoogleTask, "id">
): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    // The GoogleTask type in the service requires an 'id', but when creating a task
    // we don't have that yet, so we let the API handle it.
    await createTask(session, taskListId, task)
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

export async function updateGoogleTask(
  taskListId: string,
  taskId: string,
  task: Partial<GoogleTask>
): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await updateTask(session, taskListId, taskId, task)
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function deleteGoogleTask(
  taskListId: string,
  taskId: string
): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    await deleteTask(session, taskListId, taskId)
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

export async function completeGoogleTask(
  taskListId: string,
  taskId: string
): Promise<void> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  // Validate parameters
  if (!taskListId) {
    throw new Error("Task list ID is required")
  }

  if (!taskId) {
    throw new Error("Task ID is required")
  }

  console.log("Completing Google task:", { taskListId, taskId })

  try {
    await completeTask(session, taskListId, taskId)
  } catch (error: any) {
    console.error("Error completing task:", error)
    // Provide more helpful error message
    if (error.message) {
      console.error("Error details:", error.message)
    }
    if (error.response?.data) {
      console.error("API response error:", error.response.data)
    }
    throw error
  }
}
