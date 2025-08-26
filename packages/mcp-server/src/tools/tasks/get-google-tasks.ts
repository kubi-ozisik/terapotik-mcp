import { TasksListParamsSchema } from "@terapotik/shared";
import { z } from "zod";
import { ClientGetter, McpToolHandler, SessionAuthGetter } from "../../types/mcp";
import { authenticateAndGetClient } from ".";



/**
 * Tool name and description for getTasks
 */
export const getTasksToolInfo = {
    name: "getTasks",
    description:
        "Fetch all tasks from Google Tasks. This returns both your tasks and the available task lists with their IDs from 7 days ago to 7 days from now. You need these task list IDs to create new tasks with the createTask tool. The response includes tasks organized by task list, making it easy to understand the structure of your tasks.",
};
/**
 * Input schema for the getTasks tool using zod
 */
export const getTasksInputSchema = z.object({
    maxResults: z.number().positive().optional(),
    showCompleted: z.boolean().optional(),
    showDeleted: z.boolean().optional(),
    showHidden: z.boolean().optional(),
    dueMin: z.string().optional(),
    dueMax: z.string().optional(),
    completedMin: z.string().optional(),
    completedMax: z.string().optional(),
    updatedMin: z.string().optional(),
  });
/**
 * Creates a handler function for the getTasks MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetTasksHandler(
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

            // Parse parameters
            const taskParams = {
                showCompleted:
                    params.showCompleted !== undefined ? params.showCompleted : true,
                showDeleted:
                    params.showDeleted !== undefined ? params.showDeleted : false,
                showHidden: params.showHidden !== undefined ? params.showHidden : false,
                dueMin: params.dueMin || undefined,
                dueMax: params.dueMax || undefined,
            };

            // Fetch tasks from the API
            console.log("Calling API with params:", taskParams);
            const tasksData = await apiClient.getAllTasks(taskParams);

            // Format task data as pretty-printed text
            const formattedTaskData = JSON.stringify(tasksData, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${tasksData.items.length} tasks.`,
                    },
                    {
                        type: "text",
                        text: formattedTaskData,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getTasks tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving tasks: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}


/**
 * Tool name and description for getTaskLists
 */
export const getTaskListsToolInfo = {
    name: "getTaskLists",
    description:
        "Fetch all available task lists from Google Tasks. Use this tool to get the list of task lists with their IDs, which you need for creating tasks with the createTask tool.",
};
/**
 * Input schema for the getTaskLists tool using zod
 */
export const getTaskListsInputSchema = z.object({});
/**
 * Creates a handler function for the getTaskLists MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetTaskListsHandler(
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

            // Fetch task lists from the API
            console.log("Fetching task lists");
            const taskListsData = await apiClient.getTaskLists();

            // Format task lists as pretty-printed text
            const formattedTaskLists = JSON.stringify(taskListsData, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${taskListsData.length} task lists.`,
                    },
                    {
                        type: "text",
                        text: formattedTaskLists,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getTaskLists tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving task lists: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}


/**
* Tool name and description for getTasksForList
*/
export const getTasksForListToolInfo = {
    name: "getTasksForList",
    description:
        "Fetch tasks from a specific Google Tasks list. You need to provide the taskListId - if you don't know it, use the getTaskLists tool first to see all available task lists.",
};
/**
 * Input schema for the getTasksForList tool using zod
 */
export const getTasksForListInputSchema = z.object({
    taskListId: z.string().describe("ID of the task list to get tasks from"),
    showCompleted: z
        .boolean()
        .default(true)
        .describe("Include completed tasks in results"),
    showDeleted: z
        .boolean()
        .default(false)
        .describe("Include deleted tasks in results"),
    showHidden: z
        .boolean()
        .default(false)
        .describe("Include hidden tasks in results"),
    dueMin: z
        .string()
        .optional()
        .describe("Filter by minimum due date (RFC 3339 timestamp)"),
    dueMax: z
        .string()
        .optional()
        .describe("Filter by maximum due date (RFC 3339 timestamp)"),
});

/**
 * Input schema for the createTaskList tool using zod
 */
export const createTaskListInputSchema = z.object({
    taskTitle: z.string().describe("Title of the new task list"),
});
/**
 * Creates a handler function for the getTasksForList MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetTasksForListHandler(
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

            // Ensure we have a taskListId
            const { taskListId } = params;
            if (!taskListId) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "A task list ID is required to fetch tasks.",
                        },
                    ],
                };
            }

            // Parse parameters
            const taskParams = {
                showCompleted:
                    params.showCompleted !== undefined ? params.showCompleted : true,
                showDeleted:
                    params.showDeleted !== undefined ? params.showDeleted : false,
                showHidden: params.showHidden !== undefined ? params.showHidden : false,
                dueMin: params.dueMin || undefined,
                dueMax: params.dueMax || undefined,
            };

            // Fetch tasks from the API for the specified list
            console.log(
                `Calling API to get tasks for list ${taskListId} with params:`,
                taskParams
            );
            const tasksData = await apiClient.getTasksForList(taskListId, taskParams);

            // Format task data as pretty-printed text
            const formattedTaskData = JSON.stringify(tasksData, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${tasksData.items.length} tasks from list "${taskListId}".`,
                    },
                    {
                        type: "text",
                        text: formattedTaskData,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getTasksForList tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving tasks: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}