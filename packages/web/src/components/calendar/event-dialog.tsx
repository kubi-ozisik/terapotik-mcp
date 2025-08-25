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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

// Define our own CalendarEvent type to match the component needs
interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  recurrence?: string[]
}

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Partial<CalendarEvent> & { id?: string }
  onSave: (event: Partial<CalendarEvent>) => Promise<void>
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  onSave,
}: EventDialogProps) {
  const [title, setTitle] = useState(event?.summary || "")
  const [description, setDescription] = useState(event?.description || "")
  const [startDateTime, setStartDateTime] = useState(
    event?.start?.dateTime
      ? new Date(event.start.dateTime).toISOString().slice(0, 16)
      : ""
  )
  const [endDateTime, setEndDateTime] = useState(
    event?.end?.dateTime
      ? new Date(event.end.dateTime).toISOString().slice(0, 16)
      : ""
  )
  const [location, setLocation] = useState(event?.location || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecurring, setIsRecurring] = useState(
    event?.recurrence ? true : false
  )
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<string>(
    event?.recurrence?.[0]?.includes("DAILY")
      ? "daily"
      : event?.recurrence?.[0]?.includes("WEEKLY")
      ? "weekly"
      : event?.recurrence?.[0]?.includes("MONTHLY")
      ? "monthly"
      : "none"
  )
  const [recurrenceCount, setRecurrenceCount] = useState<string>(
    event?.recurrence?.[0]?.match(/COUNT=(\d+)/)?.[1] || "10"
  )

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const startDate = new Date(startDateTime)
      const endDate = new Date(endDateTime)

      const eventData: Partial<CalendarEvent> = {
        summary: title,
        description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location,
      }

      // Add recurrence rule if enabled
      if (isRecurring && recurrenceFrequency !== "none") {
        const freq = recurrenceFrequency.toUpperCase()
        eventData.recurrence = [`RRULE:FREQ=${freq};COUNT=${recurrenceCount}`]
      }

      await onSave(eventData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving event:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location"
            />
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <Label htmlFor="is-recurring">Recurring event</Label>
            </div>

            {isRecurring && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={recurrenceFrequency}
                    onValueChange={setRecurrenceFrequency}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="count">Number of occurrences</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="100"
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !title || !startDateTime || !endDateTime}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
