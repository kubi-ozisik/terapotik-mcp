import { z } from "zod";

/**
 * Schema for Task
 */
export const TaskSchema = z.object({
  id: z.string().nullable().optional(),
  title: z.string(),
  notes: z.string().nullable().optional(),
  status: z
    .enum(["needsAction", "completed"])
    .default("needsAction")
    .describe(
      "Status of the task: 'needsAction' means incomplete/pending, 'completed' means finished. Setting to 'completed' automatically records completion time."
    ),
  due: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Due date in RFC 3339 timestamp format (e.g., '2023-12-31T23:59:59Z')"
    ),
  completed: z.string().nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  hidden: z.boolean().nullable().optional(),
  position: z.string().nullable().optional(),
  parent: z.string().nullable().optional(),
  links: z
    .array(
      z.object({
        type: z.string().optional(),
        description: z.string().optional(),
        link: z.string().optional(),
      })
    )
    .nullable()
    .optional(),
});

/**
 * Schema for Task List
 */
export const TaskListSchema = z.object({
  id: z.string(),
  title: z.string(),
  updated: z.string().nullable().optional(),
});

/**
 * Schema for Create Task Request
 */
export const CreateTaskRequestSchema = z.object({
  task: TaskSchema,
});

/**
 * Schema for Update Task Request
 */
export const UpdateTaskRequestSchema = z.object({
  task: TaskSchema.extend({
    id: z.string().optional(),
  }),
});

/**
 * Schema for Query Parameters
 */
export const QueryParamsSchema = z.object({
  maxResults: z.string().optional(),
  showCompleted: z.enum(["true", "false"]).optional(),
  showDeleted: z.enum(["true", "false"]).optional(),
  showHidden: z.enum(["true", "false"]).optional(),
  dueMin: z.string().optional(),
  dueMax: z.string().optional(),
  completedMin: z.string().optional(),
  completedMax: z.string().optional(),
  updatedMin: z.string().optional(),
});

/**
 * Schema for Task Lists Response
 */
export const TaskListsResponseSchema = z.object({
  items: z.array(TaskListSchema),
  nextPageToken: z.string().nullable().optional(),
});

/**
 * Schema for Tasks Response
 */
export const TasksResponseSchema = z.object({
  items: z.array(TaskSchema),
  nextPageToken: z.string().nullable().optional(),
});

/**
 * Schema for All Tasks Response
 */
export const AllTasksResponseSchema = z.object({
  items: z.array(TaskSchema),
  taskLists: z.array(TaskListSchema),
  taskListsWithTasks: z.array(
    TaskListSchema.extend({
      tasks: z.array(TaskSchema),
    })
  ),
});

/**
 * Schema for Tasks List Request Parameters (converted from query parameters to typed values)
 */
export const TasksListParamsSchema = z.object({
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
 * Schema for Delete Task Request
 */
export const DeleteTaskParamsSchema = z.object({
  tasklist: z.string(),
  taskId: z.string(),
});

/**
 * Schema for Create Task List Request
 */
export const CreateTaskListRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
});
