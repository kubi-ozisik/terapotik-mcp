import { ClientGetter, McpToolHandler, SessionAuthGetter } from "../../types/mcp";
import { authenticateAndGetClient } from ".";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { SessionData } from "../../types";
import { createTaskListInputSchema } from "./get-google-tasks";

/**
 * Tool name and description for createTask
 */
export const createTaskToolInfo = {
    name: "createTask",
    description:
        "Create a new task in Google Tasks. You must provide a taskListId - if you don't know the taskListId, first use the getTasks tool which returns a list of available task lists with their IDs. Each task requires a title, and can optionally include notes, status, due date, and a parent task ID for subtasks.",
};
/**
 * Input schema for the createTask tool using zod
 */
export const createTaskInputSchema = z.object({
    taskListId: z.string().describe("ID of the task list to create the task in"),
    taskTitle: z.string().describe("Title of the task"),
    notes: z.string().optional().describe("Optional notes for the task"),
    status: z.string().optional().describe("Status of the task (needsAction or completed)"),
    due: z.string().optional().describe("Due date of the task (RFC 3339 timestamp)"),
    parent: z.string().optional().describe("ID of the parent task if this is a subtask"),
});
/**
 * Creates a handler function for the createTask MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createCreateTaskHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
): McpToolHandler {
    return async (params: any, context: any) => {
        try {
            // Authenticate and get API client
            const auth = await authenticateAndGetClient(
                context,
                sessionAuthGetter,
                clientGetter
            );

            if (!auth.success) {
                return auth.errorResponse;
            }

            const apiClient = auth.apiClient!;

            // Prepare the task object
            const task = {
                title: params.taskTitle,
                notes: params.notes,
                status: params.status,
                due: params.due,
                parent: params.parent,
                taskListId: params.taskListId,
            };

            // Log the request
            console.log(params);
            console.log(`Creating task in list ${params.taskListId}:`, task);

            // Call the API to create the task
            const createdTask = await apiClient.createTask(params.taskListId, task);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully created task "${createdTask.title}" in list ${params.taskListId}.`,
                    },
                    {
                        type: "text",
                        text: JSON.stringify(createdTask, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error("Error in createTask tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error creating task: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}

/**
 * Tool name and description for createTaskList
 */
export const createTaskListToolInfo = {
    name: "createTaskList",
    description:
        "Create a new task list in Google Tasks. This lets you organize your tasks into separate lists. You'll need the resulting task list ID to create tasks in this list using the createTask tool.",
};
/**
 * Creates a handler function for the createTaskList MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createCreateTaskListHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
): McpToolHandler {
    return async (params: any, context: any) => {
        try {
            // Authenticate and get API client
            const auth = await authenticateAndGetClient(
                context,
                sessionAuthGetter,
                clientGetter
            );

            if (!auth.success) {
                return auth.errorResponse;
            }

            const apiClient = auth.apiClient!;

            // Extract title parameter
            const { taskTitle } = params;

            if (!taskTitle || typeof taskTitle !== "string" || taskTitle.trim() === "") {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "A valid title is required to create a task list.",
                        },
                    ],
                };
            }

            // Log the request
            console.log(`Creating task list with title: ${taskTitle}`);

            // Call the API to create the task list
            const createdTaskList = await apiClient.createTaskList(taskTitle);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully created task list "${createdTaskList.title}" with ID: ${createdTaskList.id}.`,
                    },
                    {
                        type: "text",
                        text: JSON.stringify(createdTaskList, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error("Error in createTaskList tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error creating task list: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}

/**
* Tool name and description for updateTask
*/
export const updateTaskToolInfo = {
    name: "updateTask",
    description:
        "Update an existing task in Google Tasks. You must provide both the taskListId and taskId. Change only the properties you want to update. The status field controls whether a task is marked as complete - use 'needsAction' for incomplete/pending tasks or 'completed' for finished tasks. Setting a task to 'completed' will automatically record the completion time.",
};
/**
 * Input schema for the updateTask tool using zod
 */
export const updateTaskInputSchema = z.object({
    taskListId: z.string().describe("ID of the task list containing the task"),
    taskId: z.string().describe("ID of the task to update"),
    title: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional(),
    due: z.string().optional(),
});
/**
 * Creates a handler function for the updateTask MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createUpdateTaskHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
): McpToolHandler {
    return async (params: any, context: any) => {
        try {
            // Authenticate and get API client
            const auth = await authenticateAndGetClient(
                context,
                sessionAuthGetter,
                clientGetter
            );

            if (!auth.success) {
                return auth.errorResponse;
            }

            const apiClient = auth.apiClient!;

            // Ensure required fields are present
            const { taskListId, taskId } = params;
            if (!taskListId || !taskId) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Both taskListId and taskId are required to update a task.",
                        },
                    ],
                };
            }

            // Check what fields we're trying to update
            const hasTitle = params.title !== undefined;
            const hasNotes = params.notes !== undefined;
            const hasStatus = params.status !== undefined;
            const hasDue = params.due !== undefined;

            // If we're not updating any fields, return an error
            if (!hasTitle && !hasNotes && !hasStatus && !hasDue) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "No task properties provided for update. Specify at least one of: title, notes, status, or due.",
                        },
                    ],
                };
            }

            // If we're not updating the title, we need to fetch the current task to get its title
            let existingTitle: string | undefined;

            if (!hasTitle) {
                try {
                    console.log("Fetching current task to get required title...");
                    // Call the API to get the task's details to retrieve its title
                    const tasksInList = await apiClient.getTasksForList(taskListId, {
                        showCompleted: true,
                        showDeleted: true,
                        showHidden: true,
                    });

                    // Find the task in the returned list
                    const taskDetails = tasksInList.items?.find(
                        (task: any) => task.id === taskId
                    );

                    if (taskDetails && taskDetails.title) {
                        existingTitle = taskDetails.title;
                        console.log(`Retrieved existing title: "${existingTitle}"`);
                    } else {
                        console.warn(`Could not find task ${taskId} in list ${taskListId}`);
                        // We'll try to update anyway, maybe the API will accept it
                    }
                } catch (error) {
                    console.error("Error fetching task details:", error);
                    // Continue with the update, let the API handle it
                }
            }

            // Prepare the task update object with only the fields to update
            const taskUpdate: any = {
                id: taskId, // Always include ID
            };

            // Add the fields we're updating
            if (hasTitle) {
                taskUpdate.title = params.title;
            } else if (existingTitle) {
                // If we're not updating the title but retrieved it, include it
                taskUpdate.title = existingTitle;
            }

            if (hasNotes) taskUpdate.notes = params.notes;
            if (hasStatus) taskUpdate.status = params.status;
            if (hasDue) taskUpdate.due = params.due;

            // Log the request
            console.log(
                `Updating task ${taskId} in list ${taskListId} with data:`,
                taskUpdate
            );

            // Call the API to update the task
            const updatedTask = await apiClient.updateTask(
                taskListId,
                taskId,
                taskUpdate
            );

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully updated task "${updatedTask.title || taskId
                            }" in list ${taskListId}.`,
                    },
                    {
                        type: "text",
                        text: JSON.stringify(updatedTask, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error("Error in updateTask tool:", error);

            // Provide more detailed error message
            let errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            // Check for specific validation errors
            if (error instanceof Error && errorMessage.includes("Invalid")) {
                errorMessage +=
                    "\n\nMake sure your task update follows this format:\n" +
                    "- taskListId: String (required)\n" +
                    "- taskId: String (required)\n" +
                    "- title: String (optional)\n" +
                    "- notes: String (optional)\n" +
                    "- status: String - must be either 'needsAction' or 'completed' (optional)\n" +
                    "- due: String in RFC 3339 format like '2023-12-31T23:59:59Z' (optional)";
            }

            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error updating task: ${errorMessage}`,
                    },
                ],
            };
        }
    };
}

/**
* Tool name and description for deleteTask
*/
export const deleteTaskToolInfo = {
    name: "deleteTask",
    description:
        "Delete a task from Google Tasks. You must provide both the taskListId and taskId of the task to delete. This action cannot be undone, so use it carefully.",
};
/**
 * Input schema for the deleteTask tool using zod
 */
export const deleteTaskInputSchema = z.object({
    taskListId: z.string().describe("ID of the task list containing the task"),
    taskId: z.string().describe("ID of the task to delete"),
});

/**
 * Creates a handler function for the deleteTask MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createDeleteTaskHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
): McpToolHandler {
    return async (params: any, context: any) => {
        try {
            // Authenticate and get API client
            const auth = await authenticateAndGetClient(
                context,
                sessionAuthGetter,
                clientGetter
            );

            if (!auth.success) {
                return auth.errorResponse;
            }

            const apiClient = auth.apiClient!;

            // Ensure required fields are present
            const { taskListId, taskId } = params;
            if (!taskListId || !taskId) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Both taskListId and taskId are required to delete a task.",
                        },
                    ],
                };
            }

            // Log the request
            console.log(`Deleting task ${taskId} from list ${taskListId}`);

            // Call the API to delete the task
            await apiClient.deleteTask(taskListId, taskId);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully deleted task with ID "${taskId}" from list ${taskListId}.`,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in deleteTask tool:", error);

            // Provide error message
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error deleting task: ${errorMessage}`,
                    },
                ],
            };
        }
    };
}

export function registerGetTasksForListsTool(server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>): void {
    server.registerTool(
        createTaskListToolInfo.name,
        {
            title: createTaskListToolInfo.name,
            description: createTaskListToolInfo.description,
            inputSchema: createTaskListInputSchema.shape
        },
        createCreateTaskListHandler(
            (sessionId) => {
                // Get auth info from session data
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                // Get client from clients map
                return clients.get(clientId) || null;
            }
        )
    );
}

export function registerCreateTaskListTool(server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>): void {
    server.registerTool(
        createTaskListToolInfo.name,
        {
            title: createTaskListToolInfo.name,
            description: createTaskListToolInfo.description,
            inputSchema: createTaskListInputSchema.shape
        },
        createCreateTaskListHandler(
            (sessionId) => {
                // Get auth info from session data
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                // Get client from clients map
                return clients.get(clientId) || null;
            }
        )
    );
}
export function registerCreateTaskTool(server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>): void {
    server.registerTool(
        createTaskToolInfo.name,
        {
            title: createTaskToolInfo.name,
            description: createTaskToolInfo.description,
            inputSchema: createTaskInputSchema.shape
        },
        createCreateTaskHandler(
            (sessionId) => {
                // Get auth info from session data
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                // Get client from clients map
                return clients.get(clientId) || null;
            }
        )
    );
}
export function registerUpdateTaskTool(server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>): void {
    server.registerTool(
        updateTaskToolInfo.name,
        {
            title: updateTaskToolInfo.name,
            description: updateTaskToolInfo.description,
            inputSchema: updateTaskInputSchema.shape
        },
        createUpdateTaskHandler(
            (sessionId) => {
                // Get auth info from session data
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                // Get client from clients map
                return clients.get(clientId) || null;
            }
        )
    );
}
export function registerDeleteTaskTool(server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>): void {
    server.registerTool(
        deleteTaskToolInfo.name,
        {
            title: deleteTaskToolInfo.name,
            description: deleteTaskToolInfo.description,
            inputSchema: deleteTaskInputSchema.shape
        },
        createDeleteTaskHandler(
            (sessionId) => {
                // Get auth info from session data
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                // Get client from clients map
                return clients.get(clientId) || null;
            }
        )
    );
}