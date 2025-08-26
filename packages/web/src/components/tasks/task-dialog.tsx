"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { GoogleTask } from "@/services/google-tasks"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: GoogleTask
  onSave: (task: Partial<GoogleTask>) => Promise<void>
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSave,
}: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title || "")
  const [notes, setNotes] = useState(task?.notes || "")
  const [due, setDue] = useState(task?.due ? task.due.split("T")[0] : "")
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave({
        title,
        notes,
        due: due ? new Date(due).toISOString() : undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Task description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">Due Date</Label>
            <Input
              id="due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
