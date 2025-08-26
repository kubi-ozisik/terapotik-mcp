// src/services/google-tasks-service.ts

import { google, tasks_v1 } from "googleapis";
import { GoogleAuthClientWithToken } from "@terapotik/shared/types";
import {
  CreateTaskRequest,
  DeleteTaskRequest,
  Task,
  TaskList,
  TaskListsResponse,
  TasksListRequest,
  TasksListResponse,
  UpdateTaskRequest,
} from "@terapotik/shared/types";

export class GoogleTasksService {
  private tasks: tasks_v1.Tasks;

  constructor(private authClient: GoogleAuthClientWithToken) {
    this.tasks = google.tasks({
      version: "v1",
      auth: authClient.client,
    });
  }

  /**
   * Get all task lists
   * @returns Promise with task lists
   */
  async getTaskLists(): Promise<TaskListsResponse> {
    try {
      const response = await this.tasks.tasklists.list();
      const taskLists: TaskList[] = [];

      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.id && item.title) {
            taskLists.push({
              id: item.id,
              title: item.title,
              updated: item.updated || null,
            });
          }
        }
      }

      return {
        items: taskLists,
        nextPageToken: response.data.nextPageToken || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to fetch task lists: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get tasks for a specific task list
   * @param request The request parameters
   * @returns Promise with tasks
   */
  async getTasks(request: TasksListRequest): Promise<TasksListResponse> {
    try {
      const response = await this.tasks.tasks.list({
        tasklist: request.tasklist,
        maxResults: request.maxResults,
        showCompleted: request.showCompleted,
        showDeleted: request.showDeleted,
        showHidden: request.showHidden,
        dueMin: request.dueMin,
        dueMax: request.dueMax,
        completedMin: request.completedMin,
        completedMax: request.completedMax,
        updatedMin: request.updatedMin,
      });

      const tasks: Task[] = [];

      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.title) {
            const task: Task = {
              id: item.id || null,
              title: item.title,
              notes: item.notes || null,
              status:
                (item.status as "needsAction" | "completed") || "needsAction",
              due: item.due || null,
              completed: item.completed || null,
              deleted: item.deleted || null,
              hidden: item.hidden || null,
              position: item.position || null,
              parent: item.parent || null,
            };
            tasks.push(task);
          }
        }
      }

      return {
        items: tasks,
        nextPageToken: response.data.nextPageToken || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to fetch tasks for list ${request.tasklist}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Create a new task
   * @param request The create task request
   * @returns Promise with the created task
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    try {
      // Prepare request body compatible with the API
      const requestBody: tasks_v1.Schema$Task = {
        title: request.task.title,
        notes: request.task.notes,
        status: request.task.status,
        due: request.task.due,
        parent: request.task.parent,
      };

      const response = await this.tasks.tasks.insert({
        tasklist: request.tasklist,
        requestBody,
      });

      return {
        id: response.data.id || null,
        title: response.data.title || "",
        notes: response.data.notes || null,
        status:
          (response.data.status as "needsAction" | "completed") ||
          "needsAction",
        due: response.data.due || null,
        completed: response.data.completed || null,
        deleted: response.data.deleted || null,
        hidden: response.data.hidden || null,
        position: response.data.position || null,
        parent: response.data.parent || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to create task in list ${request.tasklist}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Update an existing task
   * @param request The update task request
   * @returns Promise with the updated task
   */
  async updateTask(request: UpdateTaskRequest): Promise<Task> {
    try {
      // First fetch the existing task to get all properties
      const currentTask = await this.tasks.tasks.get({
        tasklist: request.tasklist,
        task: request.taskId,
      });

      // Prepare request body compatible with the API
      const requestBody: tasks_v1.Schema$Task = {
        id: request.taskId,
        title: request.task.title,
        notes: request.task.notes,
        status: request.task.status,
        due: request.task.due,
        parent: request.task.parent,
      };

      const response = await this.tasks.tasks.update({
        tasklist: request.tasklist,
        task: request.taskId,
        requestBody,
      });

      return {
        id: response.data.id || null,
        title: response.data.title || "",
        notes: response.data.notes || null,
        status:
          (response.data.status as "needsAction" | "completed") ||
          "needsAction",
        due: response.data.due || null,
        completed: response.data.completed || null,
        deleted: response.data.deleted || null,
        hidden: response.data.hidden || null,
        position: response.data.position || null,
        parent: response.data.parent || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to update task ${request.taskId} in list ${request.tasklist}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Delete a task
   * @param request The delete task request
   * @returns Promise with void
   */
  async deleteTask(request: DeleteTaskRequest): Promise<void> {
    try {
      await this.tasks.tasks.delete({
        tasklist: request.tasklist,
        task: request.taskId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to delete task ${request.taskId} from list ${request.tasklist}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Create a new task list
   * @param title The title of the new task list
   * @returns Promise with the created task list
   */
  async createTaskList(title: string): Promise<TaskList> {
    try {
      const response = await this.tasks.tasklists.insert({
        requestBody: {
          title,
        },
      });

      return {
        id: response.data.id || "",
        title: response.data.title || "",
        updated: response.data.updated || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to create task list: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get all tasks from all task lists with optional date filtering
   * @param params Optional parameters for filtering (dueMin, dueMax, etc.)
   * @returns Promise with filtered tasks from all lists and task lists with their tasks
   */
  async getAllTasks(
    params: {
      dueMin?: string;
      dueMax?: string;
      completedMin?: string;
      completedMax?: string;
      showCompleted?: boolean;
      showDeleted?: boolean;
      showHidden?: boolean;
    } = {}
  ): Promise<{
    items: Task[];
    taskLists: TaskList[];
    taskListsWithTasks: Array<TaskList & { tasks: Task[] }>;
  }> {
    try {
      // First get all task lists
      const taskListsResponse = await this.getTaskLists();
      const taskLists = taskListsResponse.items || [];

      if (taskLists.length === 0) {
        return { items: [], taskLists: [], taskListsWithTasks: [] };
      }

      // Create default date range if none provided (1 week before to 1 week after)
      if (!params.dueMin && !params.dueMax) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const oneWeekLater = new Date();
        oneWeekLater.setDate(oneWeekLater.getDate() + 7);

        params.dueMin = oneWeekAgo.toISOString();
        params.dueMax = oneWeekLater.toISOString();
      }

      // For each task list, get its tasks with the date filters
      const taskListsWithTasksPromises = taskLists.map(async (list) => {
        if (!list.id) return { ...list, tasks: [] };

        try {
          const tasksRequest: TasksListRequest = {
            tasklist: list.id,
            // Apply date filters
            dueMin: params.dueMin,
            dueMax: params.dueMax,
            completedMin: params.completedMin,
            completedMax: params.completedMax,
            showCompleted: params.showCompleted,
            showDeleted: params.showDeleted,
            showHidden: params.showHidden,
          };

          const tasksResponse = await this.getTasks(tasksRequest);
          return {
            ...list,
            tasks: tasksResponse.items || [],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `Failed to fetch tasks for list ${list.id}: ${errorMessage}`
          );
          return { ...list, tasks: [] };
        }
      });

      // Wait for all task lists with their tasks to be fetched
      const taskListsWithTasks = await Promise.all(taskListsWithTasksPromises);

      // Extract all tasks into a flat array for backward compatibility
      const allTasks = taskListsWithTasks.flatMap((list) => list.tasks);

      return {
        items: allTasks,
        taskLists: taskLists,
        taskListsWithTasks,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to fetch all tasks: ${errorMessage}`);
      throw error;
    }
  }
}
