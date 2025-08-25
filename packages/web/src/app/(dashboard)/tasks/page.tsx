"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PlusIcon,
  RefreshCwIcon,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  FolderPlus,
} from "lucide-react"
import { GoogleTask, GoogleTaskList } from "@/services/google-tasks"
import { TaskDialog } from "@/components/tasks/task-dialog"
import { TaskListDialog } from "@/components/tasks/task-list-dialog"
import {
  getGoogleTaskLists,
  getGoogleTasks,
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  completeGoogleTask,
  createGoogleTaskList,
  updateGoogleTaskList,
  deleteGoogleTaskList,
} from "@/app/actions/tasks"

export default function TasksPage() {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([])
  const [selectedTaskList, setSelectedTaskList] = useState<string>("")
  const [tasks, setTasks] = useState<GoogleTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean
    task?: GoogleTask
  }>({ open: false })
  const [taskListDialog, setTaskListDialog] = useState<{
    open: boolean
    taskList?: GoogleTaskList
  }>({ open: false })

  useEffect(() => {
    fetchTaskLists()
  }, [])

  useEffect(() => {
    if (selectedTaskList) {
      fetchTasks(selectedTaskList)
    }
  }, [selectedTaskList])

  const fetchTaskLists = async () => {
    try {
      setIsLoading(true)
      const lists = await getGoogleTaskLists()
      setTaskLists(lists)
      if (lists.length > 0 && !selectedTaskList) {
        setSelectedTaskList(lists[0].id!)
      }
    } catch (err) {
      setError("Failed to load task lists")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTasks = async (taskListId: string) => {
    try {
      setIsLoading(true)
      const fetchedTasks = await getGoogleTasks(taskListId)
      console.log(fetchedTasks)
      setTasks(fetchedTasks)
    } catch (err) {
      setError("Failed to load tasks")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTask = async (task: Partial<GoogleTask>) => {
    try {
      await createGoogleTask(selectedTaskList, task as Omit<GoogleTask, "id">)
      fetchTasks(selectedTaskList)
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }

  const handleUpdateTask = async (
    taskId: string,
    task: Partial<GoogleTask>
  ) => {
    try {
      await updateGoogleTask(selectedTaskList, taskId, task)
      fetchTasks(selectedTaskList)
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteGoogleTask(selectedTaskList, taskId)
      fetchTasks(selectedTaskList)
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const handleCompleteTask = async (taskId: string, currentStatus: string) => {
    console.log("Handling task completion:", { taskId, currentStatus })

    if (!taskId) {
      console.error("Task ID is missing")
      setError("Cannot complete task: Missing task ID")
      return
    }

    if (!selectedTaskList) {
      console.error("Task list ID is missing")
      setError("Cannot complete task: No task list selected")
      return
    }

    try {
      if (currentStatus === "completed") {
        // Reopen task by clearing the completed status
        await updateGoogleTask(selectedTaskList, taskId, {
          status: "needsAction",
        })
      } else {
        // Complete task
        await completeGoogleTask(selectedTaskList, taskId)
      }
      fetchTasks(selectedTaskList)
    } catch (error) {
      console.error("Error updating task status:", error)
    }
  }

  const handleCreateTaskList = async (title: string) => {
    try {
      await createGoogleTaskList(title)
      fetchTaskLists()
    } catch (error) {
      console.error("Error creating task list:", error)
    }
  }

  const handleUpdateTaskList = async (title: string) => {
    if (!taskListDialog.taskList?.id) return
    try {
      await updateGoogleTaskList(taskListDialog.taskList.id, title)
      fetchTaskLists()
    } catch (error) {
      console.error("Error updating task list:", error)
    }
  }

  const handleDeleteTaskList = async (taskListId: string) => {
    try {
      await deleteGoogleTaskList(taskListId)
      fetchTaskLists()
      if (selectedTaskList === taskListId) {
        setSelectedTaskList("")
        setTasks([])
      }
    } catch (error) {
      console.error("Error deleting task list:", error)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Google Tasks</h1>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            onClick={() => fetchTasks(selectedTaskList)}
            disabled={isLoading}
          >
            <RefreshCwIcon
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setTaskListDialog({ open: true })}
          >
            <FolderPlus className="h-4 w-4" /> New List
          </Button>
          <Button
            className="gap-2"
            onClick={() => setTaskDialog({ open: true })}
            disabled={!selectedTaskList}
          >
            <PlusIcon className="h-4 w-4" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedTaskList} onValueChange={setSelectedTaskList}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select task list" />
          </SelectTrigger>
          <SelectContent>
            {taskLists.map((list) => (
              <SelectItem key={list.id} value={list.id!}>
                {list.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTaskList && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  const currentList = taskLists.find(
                    (l) => l.id === selectedTaskList
                  )
                  if (currentList) {
                    setTaskListDialog({ open: true, taskList: currentList })
                  }
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteTaskList(selectedTaskList)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <RefreshCwIcon className="h-6 w-6 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              No tasks found in this list
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() =>
                      handleCompleteTask(task.id, task.status)
                    }
                  />
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        task.status === "completed"
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.notes}
                      </p>
                    )}
                    {task.due && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Due: {new Date(task.due).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setTaskDialog({ open: true, task })}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCompleteTask(task.id, task.status)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {task.status === "completed"
                          ? "Mark as not done"
                          : "Mark as done"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteTask(task.id!)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDialog
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog({ open })}
        task={taskDialog.task}
        onSave={(task) => {
          if (taskDialog.task?.id) {
            return handleUpdateTask(taskDialog.task.id, task)
          } else {
            return handleCreateTask(task)
          }
        }}
      />

      <TaskListDialog
        open={taskListDialog.open}
        onOpenChange={(open) => setTaskListDialog({ open })}
        taskList={taskListDialog.taskList}
        onSave={(title) => {
          if (taskListDialog.taskList?.id) {
            return handleUpdateTaskList(title)
          } else {
            return handleCreateTaskList(title)
          }
        }}
      />
    </div>
  )
}
