// src/routes/google-tasks-routes.ts
import { prisma } from "@terapotik/shared";
import express, { Request, Response, Router } from "express";
import { GoogleTasksService } from "../services/google-tasks-service";
import { GoogleAuthToken } from "@terapotik/shared/types";
import {
  CreateTaskRequest,
  DeleteTaskRequest,
  Task,
  TasksListRequest,
} from "@terapotik/shared/types";
// Import the schemas from tasks.schema.ts
import {
  CreateTaskListRequestSchema,
  CreateTaskParamsSchema,
  QueryParamsSchema,
  UpdateTaskParamsSchema,
} from "@terapotik/shared";
import { createAuthenticatedClient } from "../utils/google-auth";
import { AuthenticatedRequest, getGoogleTokenForUserWithRefresh } from "../services/data-service";

const router = express.Router() as Router;


/**
 * Helper function to extract Google API error details
 */
function extractGoogleApiError(error: any): string {
  // Check if it's a GaxiosError from Google API
  if (error?.response?.data) {
    const { error: errorCode, error_description } = error.response.data;
    if (errorCode && error_description) {
      return `${errorCode}: ${error_description}`;
    }
  }

  // Check if it has nested error messages
  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown Google API error";
}

/**
 * Helper function to get Google tokens for a user from the ServiceToken collection
 */
async function getGoogleTokenForUser(req: AuthenticatedRequest): Promise<GoogleAuthToken> {
  // Get the Auth0 user ID from the JWT token
  const auth = req.auth;

  if (!auth || !auth.payload || !auth.payload.sub) {
    throw new Error("No authenticated user found in request");
  }

  // Try to find the user by Auth0 ID
  let user = await prisma.user.findFirst({
    where: { authId: auth.payload.sub },
  });

  // If not found, try to find via Account.providerAccountId
  if (!user) {
    const account = await prisma.account.findFirst({
      where: {
        providerAccountId: auth.payload.sub,
      },
      include: {
        user: true,
      },
    });

    if (account?.user) {
      user = account.user;

      // Update the user's authId for future lookups
      await prisma.user.update({
        where: { id: user.id },
        data: { authId: auth.payload.sub },
      });
    }
  }

  if (!user) {
    throw new Error(`User not found with Auth0 ID: ${auth.payload.sub}`);
  }

  // Find the user's Google service token
  const serviceToken = await prisma.serviceToken.findFirst({
    where: {
      userId: user.id,
      service: "google",
    },
  });

  if (!serviceToken || !serviceToken.accessToken) {
    throw new Error("No Google service token found for this user");
  }

  const token = {
    access_token: serviceToken.accessToken,
    refresh_token: serviceToken.refreshToken || undefined,
    scope: serviceToken.scope || "",
    token_type: "Bearer",
    expiry_date: serviceToken.expiresAt ? serviceToken.expiresAt.getTime() : 0,
  };

  console.log("Token scope:", token.scope);

  return token;
}

/**
 * GET /api/tasks/lists
 * Get all task lists
 */
router.get("/lists", async (req: Request, res: Response) => {
  try {
    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUserWithRefresh(req as AuthenticatedRequest);

    // Validate tokens have required scope
    if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
      return res.status(403).json({
        status: "error",
        message: "Missing required Google Tasks scope",
      });
    }

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const tasksService = new GoogleTasksService(authClient);

    // Get task lists
    const taskLists = await tasksService.getTaskLists();
    return res.json({
      status: "success",
      data: taskLists,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Task lists fetch failed: ${errorMessage}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch task lists",
      details: errorMessage,
    });
  }
});

/**
 * GET /api/tasks/all
 * Get all tasks from all task lists with optional date filtering
 */
router.get("/all", async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const queryValidation = QueryParamsSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters",
        details: queryValidation.error.message,
      });
    }

    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUserWithRefresh(req as AuthenticatedRequest);

    // Validate tokens have required scope
    if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
      return res.status(403).json({
        status: "error",
        message: "Missing required Google Tasks scope",
      });
    }

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const tasksService = new GoogleTasksService(authClient);

    // Parse date filter parameters
    const dateParams = {
      dueMin: req.query.dueMin as string | undefined,
      dueMax: req.query.dueMax as string | undefined,
      completedMin: req.query.completedMin as string | undefined,
      completedMax: req.query.completedMax as string | undefined,
      showCompleted: req.query.showCompleted === "true",
      showDeleted: req.query.showDeleted === "true",
      showHidden: req.query.showHidden === "true",
    };

    // Get all tasks with optional date filtering
    const result = await tasksService.getAllTasks(dateParams);

    return res.json({
      status: "success",
      data: result.items,
      taskLists: result.taskLists,
      taskListsWithTasks: result.taskListsWithTasks,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`All tasks fetch failed: ${errorMessage}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch tasks",
      details: errorMessage,
    });
  }
});

/**
 * GET /api/tasks/:tasklist/tasks
 * Get tasks from a specific task list
 */
router.get("/:tasklist/tasks", async (req: Request, res: Response) => {
  try {
    // Validate path parameter
    if (!req.params.tasklist) {
      return res.status(400).json({
        status: "error",
        message: "Task list ID is required",
      });
    }

    // Validate query parameters
    const queryValidation = QueryParamsSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters",
        details: queryValidation.error.message,
      });
    }

    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req as AuthenticatedRequest);

    // Validate tokens have required scope
    if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
      return res.status(403).json({
        status: "error",
        message: "Missing required Google Tasks scope",
      });
    }

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const tasksService = new GoogleTasksService(authClient);

    // Parse query parameters
    const tasksListRequest: TasksListRequest = {
      tasklist: req.params.tasklist,
      maxResults: req.query.maxResults
        ? parseInt(req.query.maxResults as string)
        : undefined,
      showCompleted: req.query.showCompleted === "true",
      showDeleted: req.query.showDeleted === "true",
      showHidden: req.query.showHidden === "true",
      dueMin: req.query.dueMin as string,
      dueMax: req.query.dueMax as string,
      completedMin: req.query.completedMin as string,
      completedMax: req.query.completedMax as string,
      updatedMin: req.query.updatedMin as string,
    };

    // Get tasks
    const tasks = await tasksService.getTasks(tasksListRequest);
    return res.json({
      status: "success",
      data: tasks,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Tasks fetch failed for list ${req.params.tasklist}: ${errorMessage}`
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch tasks",
      details: errorMessage,
    });
  }
});

/**
 * POST /api/tasks/:tasklist/tasks
 * Create a new task in a task list
 */
router.post("/:tasklist/tasks", async (req: Request, res: Response) => {
  try {
    // Validate path parameter
    if (!req.params.tasklist) {
      return res.status(400).json({
        status: "error",
        message: "Task list ID is required",
      });
    }

    // Validate request body
    const bodyValidation = CreateTaskParamsSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task data",
        details: bodyValidation.error.message,
      });
    }

    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req as AuthenticatedRequest);

    // Validate tokens have required scope
    if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
      return res.status(403).json({
        status: "error",
        message: "Missing required Google Tasks scope",
      });
    }

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const tasksService = new GoogleTasksService(authClient);

    // Create task request
    const createTaskRequest: CreateTaskRequest = {
      tasklist: req.params.tasklist,
      task: req.body.task as Task,
    };

    // Create task
    const createdTask = await tasksService.createTask(createTaskRequest);
    return res.status(201).json({
      status: "success",
      data: createdTask,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Task creation failed in list ${req.params.tasklist}: ${errorMessage}`
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to create task",
      details: errorMessage,
    });
  }
});

/**
 * PUT /api/tasks/:tasklist/tasks/:taskId
 * Update an existing task
 */
router.put("/:tasklist/tasks/:taskId", async (req: Request, res: Response) => {
  try {
    // Log the incoming request
    console.log(`Task update request received:`, {
      taskListId: req.params.tasklist,
      taskId: req.params.taskId,
      requestBody: req.body,
    });

    // Validate path parameters
    if (!req.params.tasklist) {
      console.log("Task update failed: Missing task list ID");
      return res.status(400).json({
        status: "error",
        message: "Task list ID is required",
      });
    }

    if (!req.params.taskId) {
      console.log("Task update failed: Missing task ID");
      return res.status(400).json({
        status: "error",
        message: "Task ID is required",
      });
    }

    // Validate request body
    const bodyValidation = UpdateTaskParamsSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      console.log("Task update failed: Invalid request body", {
        validationError: bodyValidation.error.message,
        requestBody: req.body,
      });
      return res.status(400).json({
        status: "error",
        message: "Invalid task data",
        details: bodyValidation.error.message,
      });
    }

    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req as AuthenticatedRequest);

    // Validate tokens have required scope
    if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
      console.log("Task update failed: Missing required scope");
      return res.status(403).json({
        status: "error",
        message: "Missing required Google Tasks scope",
      });
    }

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const tasksService = new GoogleTasksService(authClient);

    // Get task ID from params
    const taskId = req.params.taskId;
    const taskListId = req.params.tasklist;

    console.log(
      `Processing task update for task ${taskId} in list ${taskListId}`
    );

    // Update task request
    const updateTaskRequest = {
      tasklist: taskListId,
      taskId: taskId,
      task: {
        ...req.body.task,
        id: taskId, // Always include the ID
      },
    };

    console.log("Update task request:", updateTaskRequest);

    // Update task
    const updatedTask = await tasksService.updateTask(updateTaskRequest);
    console.log("Task updated successfully:", updatedTask);

    return res.json({
      status: "success",
      data: updatedTask,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Task update failed for ID ${req.params.taskId} in list ${req.params.tasklist}: ${errorMessage}`,
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to update task",
      details: errorMessage,
    });
  }
});

/**
 * DELETE /api/tasks/:tasklist/tasks/:taskId
 * Delete a task
 */
router.delete(
  "/:tasklist/tasks/:taskId",
  async (req: Request, res: Response) => {
    try {
      // Validate path parameters
      if (!req.params.tasklist) {
        return res.status(400).json({
          status: "error",
          message: "Task list ID is required",
        });
      }

      if (!req.params.taskId) {
        return res.status(400).json({
          status: "error",
          message: "Task ID is required",
        });
      }

      // Get the user's Google tokens from ServiceToken collection
      const tokens = await getGoogleTokenForUser(req as AuthenticatedRequest);

      // Validate tokens have required scope
      if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
        return res.status(403).json({
          status: "error",
          message: "Missing required Google Tasks scope",
        });
      }

      // Create authenticated client
      const authClient = createAuthenticatedClient(tokens);
      const tasksService = new GoogleTasksService(authClient);

      // Delete task request
      const deleteTaskRequest: DeleteTaskRequest = {
        tasklist: req.params.tasklist,
        taskId: req.params.taskId,
      };

      // Delete task
      await tasksService.deleteTask(deleteTaskRequest);
      return res.status(200).json({
        status: "success",
        message: "Task deleted successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Task deletion failed for ID ${req.params.taskId} in list ${req.params.tasklist}: ${errorMessage}`
      );
      return res.status(500).json({
        status: "error",
        message: "Failed to delete task",
        details: errorMessage,
      });
    }
  }
);

/**
 * POST /api/tasks/lists
 * Create a new task list
 */
router.post("/lists", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const bodyValidation = CreateTaskListRequestSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid task list data",
        details: bodyValidation.error.message,
      });
    }

    // Get the user's Google tokens from ServiceToken collection
    const tokens = await getGoogleTokenForUser(req as AuthenticatedRequest);

    // Validate tokens have required scope
    if (!tokens.scope.includes("https://www.googleapis.com/auth/tasks")) {
      return res.status(403).json({
        status: "error",
        message: "Missing required Google Tasks scope",
      });
    }

    // Create authenticated client
    const authClient = createAuthenticatedClient(tokens);
    const tasksService = new GoogleTasksService(authClient);

    // Create task list
    const createdTaskList = await tasksService.createTaskList(req.body.title);
    return res.status(201).json({
      status: "success",
      data: createdTaskList,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Task list creation failed: ${errorMessage}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to create task list",
      details: errorMessage,
    });
  }
});

export default router;
