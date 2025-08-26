const TERAPOTIK_API_URL =
  process.env.TERAPOTIK_API_URL || "http://localhost:3200";

import axios from "axios";
import { ZodError } from "zod";
// import {
//   AllTasksResponse,
//   AllTasksResponseSchema,
//   TasksListParams,
//   TasksListParamsSchema,
// } from "../types/tasks.schema";

import { TasksListParams, AllTasksResponse, TasksListParamsSchema, AllTasksResponseSchema } from "@terapotik/shared"

/**
 * Custom error class for API client errors
 */
export class TerapotikApiError extends Error {
  public readonly status?: number;
  public readonly validationErrors?: ZodError;

  constructor(
    message: string,
    options?: { status?: number; validationErrors?: ZodError }
  ) {
    super(message);
    this.name = "TerapotikApiError";
    this.status = options?.status;
    this.validationErrors = options?.validationErrors;
  }
}

/**
 * Client for interacting with the Terapotik API
 */
export class TerapotikApiClient {
  private baseUrl: string;
  private accessToken: string;

  /**
   * Create a new Terapotik API client
   * @param accessToken The OAuth access token for authentication
   * @param baseUrl The base URL of the API (defaults to TERAPOTIK_API_URL)
   */
  constructor(accessToken: string, baseUrl = TERAPOTIK_API_URL) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    console.log(
      `TerapotikApiClient initialized with token length: ${accessToken.length}`
    );
    console.log(`First 20 chars of token: ${accessToken.substring(0, 20)}...`);
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Get all tasks from all task lists
   * @param params Optional filter parameters
   * @returns Promise with tasks data
   * @throws TerapotikApiError if params are invalid or API request fails
   */
  async getAllTasks(params?: TasksListParams): Promise<AllTasksResponse> {
    try {
      console.log(`getAllTasks called with params:`, params);
      // Validate params if provided
      if (params) {
        try {
          TasksListParamsSchema.parse(params);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new TerapotikApiError(
              `Invalid task list parameters: ${error.message}`,
              { validationErrors: error }
            );
          }
          throw error;
        }
      }

      // Convert params to query string
      const queryParams = new URLSearchParams();
      if (params) {
        // Convert boolean values to strings for query params
        const stringParams: Record<string, string> = {};

        if (params.showCompleted !== undefined) {
          stringParams.showCompleted = params.showCompleted ? "true" : "false";
        }
        if (params.showDeleted !== undefined) {
          stringParams.showDeleted = params.showDeleted ? "true" : "false";
        }
        if (params.showHidden !== undefined) {
          stringParams.showHidden = params.showHidden ? "true" : "false";
        }
        if (params.maxResults !== undefined) {
          stringParams.maxResults = params.maxResults.toString();
        }

        // Add date parameters directly
        if (params.dueMin) stringParams.dueMin = params.dueMin;
        if (params.dueMax) stringParams.dueMax = params.dueMax;
        if (params.completedMin)
          stringParams.completedMin = params.completedMin;
        if (params.completedMax)
          stringParams.completedMax = params.completedMax;
        if (params.updatedMin) stringParams.updatedMin = params.updatedMin;

        // Add all params to query string
        Object.entries(stringParams).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
      }

      const url = `${this.baseUrl}/api/tasks/all?${queryParams.toString()}`;
      console.log(`Making API request to: ${url}`);
      console.log(
        `Using authorization header: Bearer ${this.accessToken.substring(
          0,
          10
        )}...`
      );

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        const result = {
          items: response.data.data,
          taskLists: response.data.taskLists,
          taskListsWithTasks: response.data.taskListsWithTasks,
        };

        // Validate response data
        try {
          return AllTasksResponseSchema.parse(result);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new TerapotikApiError(
              `Invalid response format from API: ${error.message}`,
              { validationErrors: error }
            );
          }
          throw error;
        }
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to fetch tasks",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error fetching all tasks:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get all task lists
   * @returns Promise with task lists data
   * @throws TerapotikApiError if API request fails
   */
  async getTaskLists(): Promise<any[]> {
    try {
      console.log(`getTaskLists called`);

      const url = `${this.baseUrl}/api/tasks/lists`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to fetch task lists",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error fetching task lists:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get tasks for a specific task list
   * @param taskListId The ID of the task list to get tasks from
   * @param params Optional filter parameters
   * @returns Promise with tasks data
   * @throws TerapotikApiError if params are invalid or API request fails
   */
  async getTasksForList(
    taskListId: string,
    params?: TasksListParams
  ): Promise<any> {
    try {
      console.log(
        `getTasksForList called for list ${taskListId} with params:`,
        params
      );

      // Validate params if provided
      if (params) {
        try {
          TasksListParamsSchema.parse(params);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new TerapotikApiError(
              `Invalid task list parameters: ${error.message}`,
              { validationErrors: error }
            );
          }
          throw error;
        }
      }

      // Convert params to query string
      const queryParams = new URLSearchParams();
      if (params) {
        // Convert boolean values to strings for query params
        if (params.showCompleted !== undefined) {
          queryParams.append(
            "showCompleted",
            params.showCompleted ? "true" : "false"
          );
        }
        if (params.showDeleted !== undefined) {
          queryParams.append(
            "showDeleted",
            params.showDeleted ? "true" : "false"
          );
        }
        if (params.showHidden !== undefined) {
          queryParams.append(
            "showHidden",
            params.showHidden ? "true" : "false"
          );
        }
        if (params.maxResults !== undefined) {
          queryParams.append("maxResults", params.maxResults.toString());
        }

        // Add date parameters directly
        if (params.dueMin) queryParams.append("dueMin", params.dueMin);
        if (params.dueMax) queryParams.append("dueMax", params.dueMax);
        if (params.completedMin)
          queryParams.append("completedMin", params.completedMin);
        if (params.completedMax)
          queryParams.append("completedMax", params.completedMax);
        if (params.updatedMin)
          queryParams.append("updatedMin", params.updatedMin);
      }

      const url = `${this.baseUrl
        }/api/tasks/${taskListId}/tasks?${queryParams.toString()}`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message ||
          `Failed to fetch tasks for list ${taskListId}`,
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error(`Error fetching tasks for list ${taskListId}:`, error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a new task list
   * @param title The title of the new task list
   * @returns Promise with the created task list data
   * @throws TerapotikApiError if API request fails
   */
  async createTaskList(title: string): Promise<any> {
    try {
      console.log(`createTaskList called with title: ${title}`);

      const url = `${this.baseUrl}/api/tasks/lists`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.post(
        url,
        { title },
        { headers: this.getHeaders() }
      );

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to create task list",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error creating task list:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a new task in a specified task list
   * @param taskListId The ID of the task list to add the task to
   * @param task The task data to create
   * @returns Promise with the created task data
   * @throws TerapotikApiError if task data is invalid or API request fails
   */
  async createTask(
    taskListId: string,
    task: {
      title: string;
      notes?: string;
      status?: "needsAction" | "completed";
      due?: string;
      parent?: string;
    }
  ): Promise<any> {
    try {
      console.log(`createTask called with taskListId=${taskListId}`, task);

      const url = `${this.baseUrl}/api/tasks/${taskListId}/tasks`;
      console.log(`Making API request to: ${url}`);

      // Make the API request
      const response = await axios.post(
        url,
        { task, taskListId },
        { headers: this.getHeaders() }
      );

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to create task",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error creating task:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update an existing task in a specified task list
   * @param taskListId The ID of the task list containing the task
   * @param taskId The ID of the task to update
   * @param taskUpdate The updated task data
   * @returns Promise with the updated task data
   * @throws TerapotikApiError if task data is invalid or API request fails
   */
  async updateTask(
    taskListId: string,
    taskId: string,
    taskUpdate: {
      title?: string;
      notes?: string | null;
      status?: "needsAction" | "completed";
      due?: string | null;
      parent?: string | null;
    }
  ): Promise<any> {
    try {
      console.log(
        `updateTask called with taskListId=${taskListId}, taskId=${taskId}`,
        taskUpdate
      );

      const url = `${this.baseUrl}/api/tasks/${taskListId}/tasks/${taskId}`;
      console.log(`Making API request to: ${url}`);

      // First get the current task to get the title if not provided
      let task = {
        ...taskUpdate,
        id: taskId,
      };

      // If the title is not provided and we're just updating status or another field,
      // we need to fetch the existing task first to get the title
      if (!taskUpdate.title) {
        try {
          console.log("Title not provided, fetching current task details...");
          const currentTaskUrl = `${this.baseUrl}/api/tasks/${taskListId}/tasks/${taskId}`;
          const currentTaskResponse = await axios.get(currentTaskUrl, {
            headers: this.getHeaders(),
          });

          if (
            currentTaskResponse.data.status === "success" &&
            currentTaskResponse.data.data
          ) {
            // Add the title from the existing task
            task.title = currentTaskResponse.data.data.title;
            console.log(`Retrieved existing title: "${task.title}"`);
          }
        } catch (err) {
          console.error("Failed to fetch current task details:", err);
          // Continue with the update attempt anyway
        }
      }

      // Format the request body according to the schema
      const requestBody = {
        task: task,
        taskListId: taskListId,
        taskId: taskId,
      };

      console.log(
        "Sending request with body:",
        JSON.stringify(requestBody, null, 2)
      );

      // Make the API request
      const response = await axios.put(url, requestBody, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to update task",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        const details = error.response?.data?.details;

        console.error("API error details:", {
          status,
          message,
          details,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data,
          },
        });

        // Specific error handling for validation errors
        if (status === 400 && details?.includes("title")) {
          throw new TerapotikApiError(
            `Missing required 'title' field in task update. The API requires a title even when only updating the status.`,
            { status }
          );
        }

        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error updating task:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete a task from a specified task list
   * @param taskListId The ID of the task list containing the task
   * @param taskId The ID of the task to delete
   * @returns Promise with the response data
   * @throws TerapotikApiError if API request fails
   */
  async deleteTask(taskListId: string, taskId: string): Promise<any> {
    try {
      console.log(
        `deleteTask called with taskListId=${taskListId}, taskId=${taskId}`
      );

      const url = `${this.baseUrl}/api/tasks/${taskListId}/tasks/${taskId}`;
      console.log(`Making API request to: ${url}`);

      // Make the API request
      const response = await axios.delete(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to delete task",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        console.error("API error details:", {
          status,
          message,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          },
        });

        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error deleting task:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get the user's calendar list
   * @returns Promise with the calendar list data
   * @throws TerapotikApiError if API request fails
   */
  async getCalendarList(): Promise<any> {
    try {
      console.log("getCalendarList called");

      const url = `${this.baseUrl}/api/calendar/list`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to fetch calendar list",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error fetching calendar list:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get calendar events with optional filters
   * @param params Optional filter parameters
   * @returns Promise with calendar events data
   * @throws TerapotikApiError if API request fails
   */
  async getCalendarEvents(params?: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  }): Promise<any> {
    try {
      console.log(`getCalendarEvents called with params:`, params);

      // Convert params to query string
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.calendarId) {
          queryParams.append("calendarId", params.calendarId);
        }
        if (params.timeMin) {
          queryParams.append("timeMin", params.timeMin);
        }
        if (params.timeMax) {
          queryParams.append("timeMax", params.timeMax);
        }
        if (params.maxResults !== undefined) {
          queryParams.append("maxResults", params.maxResults.toString());
        }
        if (params.singleEvents !== undefined) {
          queryParams.append(
            "singleEvents",
            params.singleEvents ? "true" : "false"
          );
        }
        if (params.orderBy) {
          queryParams.append("orderBy", params.orderBy);
        }
      }

      const url = `${this.baseUrl
        }/api/calendar/events?${queryParams.toString()}`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to fetch calendar events",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error fetching calendar events:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get calendar events for a specific date
   * @param date Date in YYYY-MM-DD format
   * @param params Optional parameters
   * @returns Promise with events data
   * @throws TerapotikApiError if API request fails
   */
  async getEventsForDate(
    date: string,
    params?: {
      calendarId?: string;
      maxResults?: number;
    }
  ): Promise<any> {
    try {
      console.log(`getEventsForDate called with date=${date}, params:`, params);

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new TerapotikApiError(
          "Invalid date format. Please use YYYY-MM-DD format."
        );
      }

      // Convert params to query string
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.calendarId) {
          queryParams.append("calendarId", params.calendarId);
        }
        if (params.maxResults !== undefined) {
          queryParams.append("maxResults", params.maxResults.toString());
        }
      }

      const url = `${this.baseUrl
        }/api/calendar/events/date/${date}?${queryParams.toString()}`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to fetch events for date",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error(`Error fetching events for date ${date}:`, error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get calendar events for a date range
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param params Optional parameters
   * @returns Promise with events data
   * @throws TerapotikApiError if API request fails
   */
  async getEventsForDateRange(
    startDate: string,
    endDate: string,
    params?: {
      calendarId?: string;
      maxResults?: number;
    }
  ): Promise<any> {
    try {
      console.log(
        `getEventsForDateRange called with startDate=${startDate}, endDate=${endDate}, params:`,
        params
      );

      // Validate date formats
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ) {
        throw new TerapotikApiError(
          "Invalid date format. Please use YYYY-MM-DD format for both dates."
        );
      }

      // Convert params to query string
      const queryParams = new URLSearchParams();
      queryParams.append("startDate", startDate);
      queryParams.append("endDate", endDate);

      if (params) {
        if (params.calendarId) {
          queryParams.append("calendarId", params.calendarId);
        }
        if (params.maxResults !== undefined) {
          queryParams.append("maxResults", params.maxResults.toString());
        }
      }

      const url = `${this.baseUrl
        }/api/calendar/events/range?${queryParams.toString()}`;
      console.log(`Making API request to: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to fetch events for date range",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error(
        `Error fetching events for date range ${startDate} to ${endDate}:`,
        error
      );
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a new calendar event
   * @param calendarId The calendar ID (default: primary)
   * @param event The event data to create
   * @returns Promise with the created event data
   * @throws TerapotikApiError if API request fails
   */
  async createCalendarEvent(
    calendarId: string = "primary",
    event: {
      summary: string;
      description?: string;
      location?: string;
      start: {
        dateTime: string;
        timeZone?: string;
      };
      end: {
        dateTime: string;
        timeZone?: string;
      };
      status?: "confirmed" | "tentative" | "cancelled";
      colorId?: string;
    }
  ): Promise<any> {
    try {
      console.log(
        `createCalendarEvent called with calendarId=${calendarId}`,
        event
      );

      const url = `${this.baseUrl}/api/calendar/events`;
      console.log(`Making API request to: ${url}`);

      // Make the API request - keep the format expected by the API
      const response = await axios.post(
        url,
        { calendarId, event },
        { headers: this.getHeaders() }
      );

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to create calendar event",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error creating calendar event:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a recurring calendar event
   * @param calendarId The calendar ID (default: primary)
   * @param event The event data to create
   * @param recurrence The recurrence rule
   * @returns Promise with the created event data
   * @throws TerapotikApiError if API request fails
   */
  async createRecurringEvent(
    calendarId: string = "primary",
    event: {
      summary: string;
      description?: string;
      location?: string;
      start: {
        dateTime: string;
        timeZone?: string;
      };
      end: {
        dateTime: string;
        timeZone?: string;
      };
      status?: "confirmed" | "tentative" | "cancelled";
      colorId?: string;
    },
    recurrence: {
      frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
      interval?: number;
      count?: number;
      until?: string;
      byDay?: string[];
      byMonth?: number[];
      byMonthDay?: number[];
    }
  ): Promise<any> {
    try {
      console.log(`createRecurringEvent called with calendarId=${calendarId}`, {
        event,
        recurrence,
      });

      const url = `${this.baseUrl}/api/calendar/events/recurring`;
      console.log(`Making API request to: ${url}`);

      // Make the API request - keep the format expected by the API
      const response = await axios.post(
        url,
        { calendarId, event, recurrence },
        { headers: this.getHeaders() }
      );

      console.log(`API response status: ${response.status}`);

      if (response.data.status === "success") {
        return response.data.data;
      } else {
        throw new TerapotikApiError(
          response.data.message || "Failed to create recurring calendar event",
          { status: response.status }
        );
      }
    } catch (error) {
      // If it's already a TerapotikApiError, just rethrow it
      if (error instanceof TerapotikApiError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        throw new TerapotikApiError(`API request failed: ${message}`, {
          status,
        });
      }

      // Handle any other errors
      console.error("Error creating recurring calendar event:", error);
      throw new TerapotikApiError(
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }
}
