import { calendar_v3, google } from "googleapis";
import {
  CalendarEvent,
  CalendarEventsRequest,
  CalendarEventsResponse,
  CalendarListEntry,
  CalendarListResponse,
  RecurrenceRule,
} from "@terapotik/shared/types";
import { GoogleAuthClientWithToken } from "@terapotik/shared/types";

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(private authClient: GoogleAuthClientWithToken) {
    this.calendar = google.calendar({
      version: "v3",
      auth: authClient.client,
    });
  }

  /**
   * Fetch calendar events for a specific date range
   * @param request Calendar events request parameters
   * @returns Promise with calendar events
   */
  async getEvents(
    request: CalendarEventsRequest
  ): Promise<CalendarEventsResponse> {
    try {
      const calendarId = request.calendarId || "primary";

      // Do not URL encode 'primary' or email addresses for Google Calendar API
      const calendarIdParam = calendarId === "primary" ? "primary" : calendarId;

      const response = await this.calendar.events.list({
        calendarId: calendarIdParam,
        timeMin: request.timeMin || new Date().toISOString(),
        timeMax: request.timeMax,
        maxResults: request.maxResults || 10,
        singleEvents: request.singleEvents || true,
        orderBy: request.orderBy || "startTime",
      });

      // Map the response to our types
      const events: CalendarEvent[] = [];

      if (response.data.items) {
        for (const item of response.data.items) {
          if (
            item.id &&
            item.summary &&
            item.start?.dateTime &&
            item.end?.dateTime
          ) {
            const event: CalendarEvent = {
              id: item.id,
              summary: item.summary,
              description: item.description || null,
              location: item.location || null,
              start: {
                dateTime: item.start.dateTime,
                timeZone: item.start.timeZone || null,
              },
              end: {
                dateTime: item.end.dateTime,
                timeZone: item.end.timeZone || null,
              },
              status: item.status as "confirmed" | "tentative" | "cancelled",
              htmlLink: item.htmlLink || null,
              colorId: item.colorId || null,
            };

            // Add optional fields if they exist
            if (item.organizer) {
              event.organizer = {
                email: item.organizer.email || "",
                displayName: item.organizer.displayName || null,
              };
            }

            if (item.attendees) {
              event.attendees = item.attendees.map((attendee) => ({
                email: attendee.email || "",
                name: attendee.displayName || null,
                responseStatus: attendee.responseStatus as
                  | "needsAction"
                  | "declined"
                  | "tentative"
                  | "accepted"
                  | undefined,
              }));
            }

            events.push(event);
          }
        }
      }

      return {
        items: events,
        nextPageToken: response.data.nextPageToken || null,
        nextSyncToken: response.data.nextSyncToken || null,
      };
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   * @param calendarId The calendar ID (default: 'primary')
   * @param event The event to create
   * @returns Promise with the created event
   */
  async createEvent(
    calendarId: string = "primary",
    eventData: CalendarEvent
  ): Promise<CalendarEvent> {
    try {
      // Do not URL encode 'primary' or email addresses for Google Calendar API
      // Google Calendar API handles these IDs correctly without encoding
      const calendarIdParam = calendarId === "primary" ? "primary" : calendarId;

      // Transform our CalendarEvent to Google API format
      const requestBody: calendar_v3.Schema$Event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: eventData.start,
        end: eventData.end,
        status: eventData.status,
        colorId: eventData.colorId,
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarIdParam,
        requestBody,
      });

      // Map the response back to our CalendarEvent type
      const createdEvent: CalendarEvent = {
        id: response.data.id || "",
        summary: response.data.summary || "",
        description: response.data.description || null,
        location: response.data.location || null,
        start: {
          dateTime: response.data.start?.dateTime || new Date().toISOString(),
          timeZone: response.data.start?.timeZone || null,
        },
        end: {
          dateTime: response.data.end?.dateTime || new Date().toISOString(),
          timeZone: response.data.end?.timeZone || null,
        },
        status: response.data.status as "confirmed" | "tentative" | "cancelled",
        htmlLink: response.data.htmlLink || null,
        colorId: response.data.colorId || null,
      };

      return createdEvent;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   * @param calendarId The calendar ID (default: 'primary')
   * @param eventId The event ID to update
   * @param event The updated event data
   * @returns Promise with the updated event
   */
  async updateEvent(
    calendarId: string = "primary",
    eventId: string,
    eventData: CalendarEvent
  ): Promise<CalendarEvent> {
    try {
      // Do not URL encode 'primary' or email addresses for Google Calendar API
      const calendarIdParam = calendarId === "primary" ? "primary" : calendarId;

      // Always URL encode the eventId to handle special characters
      const encodedEventId = encodeURIComponent(eventId);

      // Transform our CalendarEvent to Google API format
      const requestBody: calendar_v3.Schema$Event = {
        id: eventId, // Always include the ID
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: eventData.start,
        end: eventData.end,
        status: eventData.status,
        colorId: eventData.colorId,
      };

      const response = await this.calendar.events.update({
        calendarId: calendarIdParam,
        eventId: encodedEventId,
        requestBody,
      });

      // Map the response back to our CalendarEvent type
      const updatedEvent: CalendarEvent = {
        id: response.data.id || "",
        summary: response.data.summary || "",
        description: response.data.description || null,
        location: response.data.location || null,
        start: {
          dateTime: response.data.start?.dateTime || new Date().toISOString(),
          timeZone: response.data.start?.timeZone || null,
        },
        end: {
          dateTime: response.data.end?.dateTime || new Date().toISOString(),
          timeZone: response.data.end?.timeZone || null,
        },
        status: response.data.status as "confirmed" | "tentative" | "cancelled",
        htmlLink: response.data.htmlLink || null,
        colorId: response.data.colorId || null,
      };

      return updatedEvent;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   * @param calendarId The calendar ID (default: 'primary')
   * @param eventId The event ID to delete
   * @returns Promise with void
   */
  async deleteEvent(
    calendarId: string = "primary",
    eventId: string
  ): Promise<void> {
    try {
      // Do not URL encode 'primary' or email addresses for Google Calendar API
      const calendarIdParam = calendarId === "primary" ? "primary" : calendarId;

      // Always URL encode the eventId to handle special characters
      const encodedEventId = encodeURIComponent(eventId);

      await this.calendar.events.delete({
        calendarId: calendarIdParam,
        eventId: encodedEventId,
      });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw error;
    }
  }

  /**
   * Get the list of calendars for the user
   * @returns Promise with list of calendars
   */
  async getCalendarList(): Promise<CalendarListResponse> {
    try {
      const response = await this.calendar.calendarList.list({
        minAccessRole: "reader", // Only get calendars with at least reader access
        showDeleted: false,
        showHidden: false,
      });

      const calendarList: CalendarListEntry[] = [];

      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.id && item.summary) {
            calendarList.push({
              id: item.id,
              summary: item.summary,
              description: item.description || null,
              location: item.location || null,
              timeZone: item.timeZone || null,
              backgroundColor: item.backgroundColor || null,
              foregroundColor: item.foregroundColor || null,
              primary: item.primary || false,
              accessRole: item.accessRole as
                | "reader"
                | "writer"
                | "owner"
                | undefined,
            });
          }
        }
      }

      return {
        items: calendarList,
        nextPageToken: response.data.nextPageToken || null,
        nextSyncToken: response.data.nextSyncToken || null,
      };
    } catch (error) {
      console.error("Error fetching calendar list:", error);
      throw error;
    }
  }

  /**
   * Create a recurring calendar event
   * @param calendarId The calendar ID (default: 'primary')
   * @param event The base event to create
   * @param recurrenceRule The recurrence rule
   * @returns Promise with the created recurring event
   */
  async createRecurringEvent(
    calendarId: string = "primary",
    eventData: CalendarEvent,
    recurrenceRule: RecurrenceRule
  ): Promise<CalendarEvent> {
    try {
      // Do not URL encode 'primary' or email addresses for Google Calendar API
      const calendarIdParam = calendarId === "primary" ? "primary" : calendarId;

      // Build the RRULE string for recurrence
      const rrule = this.buildRecurrenceRule(recurrenceRule);

      // Transform our CalendarEvent to Google API format with recurrence
      const requestBody: calendar_v3.Schema$Event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: eventData.start,
        end: eventData.end,
        status: eventData.status,
        colorId: eventData.colorId,
        recurrence: [rrule],
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarIdParam,
        requestBody,
      });

      // Map the response back to our CalendarEvent type
      const createdEvent: CalendarEvent = {
        id: response.data.id || "",
        summary: response.data.summary || "",
        description: response.data.description || null,
        location: response.data.location || null,
        start: {
          dateTime: response.data.start?.dateTime || new Date().toISOString(),
          timeZone: response.data.start?.timeZone || null,
        },
        end: {
          dateTime: response.data.end?.dateTime || new Date().toISOString(),
          timeZone: response.data.end?.timeZone || null,
        },
        status: response.data.status as "confirmed" | "tentative" | "cancelled",
        htmlLink: response.data.htmlLink || null,
        colorId: response.data.colorId || null,
        recurrence: response.data.recurrence || [],
      };

      return createdEvent;
    } catch (error) {
      console.error("Error creating recurring calendar event:", error);
      throw error;
    }
  }

  /**
   * Build an RRULE string from RecurrenceRule object
   * @param rule The recurrence rule object
   * @returns RRULE formatted string
   */
  private buildRecurrenceRule(rule: RecurrenceRule): string {
    // Start building the RRULE string
    let rrule = `RRULE:FREQ=${rule.frequency}`;

    // Add interval if specified
    if (rule.interval && rule.interval > 1) {
      rrule += `;INTERVAL=${rule.interval}`;
    }

    // Add count if specified
    if (rule.count && rule.count > 0) {
      rrule += `;COUNT=${rule.count}`;
    }

    // Add until date if specified
    if (rule.until) {
      // Format: YYYYMMDDTHHMMSSZ
      const untilDate = new Date(rule.until);
      const formattedDate = untilDate
        .toISOString()
        .replace(/[-:]/g, "") // Remove dashes and colons
        .replace(/\.\d{3}/, "") // Remove milliseconds
        .replace(/Z$/, "Z"); // Keep the Z (UTC indicator)

      rrule += `;UNTIL=${formattedDate}`;
    }

    // Add BYDAY if specified
    if (rule.byDay && rule.byDay.length > 0) {
      rrule += `;BYDAY=${rule.byDay.join(",")}`;
    }

    // Add BYMONTH if specified
    if (rule.byMonth && rule.byMonth.length > 0) {
      rrule += `;BYMONTH=${rule.byMonth.join(",")}`;
    }

    // Add BYMONTHDAY if specified
    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      rrule += `;BYMONTHDAY=${rule.byMonthDay.join(",")}`;
    }

    return rrule;
  }
}
