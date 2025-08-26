export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: {
    dateTime: string;
    timeZone?: string | null;
  };
  end: {
    dateTime: string;
    timeZone?: string | null;
  };
  attendees?: Array<{
    email: string;
    name?: string | null;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }>;
  organizer?: {
    email: string;
    displayName?: string | null;
  } | null;
  status?: "confirmed" | "tentative" | "cancelled";
  htmlLink?: string | null;
  colorId?: string | null;
  recurrence?: string[];
}

export interface RecurrenceRule {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  timeZone?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  primary?: boolean;
  accessRole?: "reader" | "writer" | "owner";
}

export interface CalendarListResponse {
  items: CalendarListEntry[];
  nextPageToken?: string | null;
  nextSyncToken?: string | null;
}

export interface CalendarEventsRequest {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: string;
}

export interface CalendarEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string | null;
  nextSyncToken?: string | null;
}
