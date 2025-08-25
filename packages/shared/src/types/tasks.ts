// src/types/tasks.ts

export interface Task {
  id?: string | null;
  title: string;
  notes?: string | null;
  status?: "needsAction" | "completed";
  due?: string | null;
  completed?: string | null;
  deleted?: boolean | null;
  hidden?: boolean | null;
  position?: string | null;
  parent?: string | null;
  links?: Array<{
    type?: string;
    description?: string;
    link?: string;
  }> | null;
}

export interface TaskList {
  id: string;
  title: string;
  updated?: string | null;
}

export interface TasksListRequest {
  tasklist: string;
  maxResults?: number;
  showCompleted?: boolean;
  showDeleted?: boolean;
  showHidden?: boolean;
  dueMin?: string;
  dueMax?: string;
  completedMin?: string;
  completedMax?: string;
  updatedMin?: string;
}

export interface TasksListResponse {
  items: Task[];
  nextPageToken?: string | null;
}

export interface TaskListsResponse {
  items: TaskList[];
  nextPageToken?: string | null;
}

export interface CreateTaskRequest {
  tasklist: string;
  task: Task;
}

export interface UpdateTaskRequest {
  tasklist: string;
  taskId: string;
  task: Task;
}

export interface DeleteTaskRequest {
  tasklist: string;
  taskId: string;
}
