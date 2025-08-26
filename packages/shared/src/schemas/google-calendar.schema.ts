import { z } from "zod";

// DateTime schema for Google Calendar
const DateTimeSchema = z.object({
  dateTime: z.string().datetime(),
  timeZone: z.string().optional(),
});

// All-day event date schema
const DateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().optional(),
});

// Event attendee schema
const AttendeeSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  responseStatus: z.enum(["needsAction", "declined", "tentative", "accepted"]).optional(),
});

// Event organizer schema
const OrganizerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
});

// Create event input schema (for MCP tools and API validation)
export const CreateCalendarEventSchema = z.object({
  id: z.string().optional(),
  summary: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  start: DateTimeSchema.or(DateSchema),
  end: DateTimeSchema.or(DateSchema),
  attendees: z.array(AttendeeSchema).optional(),
  colorId: z.string().optional(),
  calendarId: z.string().default("primary"),
});

export const CreateCalendarEventRequestSchema = z.object({
  calendarId: z.string().default("primary"),
  event: CreateCalendarEventSchema,
});

// Update event input schema
export const UpdateCalendarEventSchema = CreateCalendarEventSchema.partial().extend({
  id: z.string().min(1, "Event ID is required"),
});

// Get events query parameters schema
export const GetCalendarEventsSchema = z.object({
  calendarId: z.string().default("primary"),
  timeMin: z.string().datetime().optional(),
  timeMax: z.string().datetime().optional(), 
  maxResults: z.number().int().min(1).max(2500).default(50),
  singleEvents: z.boolean().default(true),
  orderBy: z.enum(["startTime", "updated"]).default("startTime"),
});

// Delete event parameters schema
export const DeleteCalendarEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  calendarId: z.string().default("primary"),
});

// MCP tool schemas for calendar operations
export const McpCreateEventSchema = {
  type: "object" as const,
  properties: {
    summary: { 
      type: "string" as const, 
      description: "Event title/summary" 
    },
    description: { 
      type: "string" as const, 
      description: "Event description (optional)" 
    },
    location: { 
      type: "string" as const, 
      description: "Event location (optional)" 
    },
    startDateTime: { 
      type: "string" as const, 
      description: "Start date and time in ISO format (e.g., 2025-08-26T10:00:00Z)" 
    },
    endDateTime: { 
      type: "string" as const, 
      description: "End date and time in ISO format (e.g., 2025-08-26T11:00:00Z)" 
    },
    attendees: { 
      type: "array" as const,
      items: { type: "string" as const },
      description: "List of attendee email addresses (optional)" 
    },
    calendarId: { 
      type: "string" as const, 
      description: "Calendar ID (defaults to 'primary')" 
    }
  },
  required: ["summary", "startDateTime", "endDateTime"] as const,
  additionalProperties: false as const
};

export const McpGetEventsSchema = {
  type: "object" as const,
  properties: {
    calendarId: { 
      type: "string" as const, 
      description: "Calendar ID (defaults to 'primary')" 
    },
    timeMin: { 
      type: "string" as const, 
      description: "Start time for events (ISO format, optional)" 
    },
    timeMax: { 
      type: "string" as const, 
      description: "End time for events (ISO format, optional)" 
    },
    maxResults: { 
      type: "number" as const, 
      description: "Maximum number of events to return (1-2500, default 50)" 
    },
    query: { 
      type: "string" as const, 
      description: "Search query to filter events (optional)" 
    }
  },
  additionalProperties: false as const
};

export const McpUpdateEventSchema = {
  type: "object" as const,
  properties: {
    eventId: { 
      type: "string" as const, 
      description: "Event ID to update" 
    },
    calendarId: { 
      type: "string" as const, 
      description: "Calendar ID (defaults to 'primary')" 
    },
    summary: { 
      type: "string" as const, 
      description: "Event title/summary (optional)" 
    },
    description: { 
      type: "string" as const, 
      description: "Event description (optional)" 
    },
    location: { 
      type: "string" as const, 
      description: "Event location (optional)" 
    },
    startDateTime: { 
      type: "string" as const, 
      description: "Start date and time in ISO format (optional)" 
    },
    endDateTime: { 
      type: "string" as const, 
      description: "End date and time in ISO format (optional)" 
    }
  },
  required: ["eventId"] as const,
  additionalProperties: false as const
};

export const McpDeleteEventSchema = {
  type: "object" as const,
  properties: {
    eventId: { 
      type: "string" as const, 
      description: "Event ID to delete" 
    },
    calendarId: { 
      type: "string" as const, 
      description: "Calendar ID (defaults to 'primary')" 
    }
  },
  required: ["eventId"] as const,
  additionalProperties: false as const
};

// Type exports for TypeScript
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventSchema>;
export type GetCalendarEventsInput = z.infer<typeof GetCalendarEventsSchema>;
export type DeleteCalendarEventInput = z.infer<typeof DeleteCalendarEventSchema>;
