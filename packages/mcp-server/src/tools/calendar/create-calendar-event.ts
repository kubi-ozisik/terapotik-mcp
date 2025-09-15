import z from "zod";
import { ClientGetter, McpToolHandler, SessionAuthGetter } from "../../types/mcp";
import { authenticateAndGetClient } from ".";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { SessionData } from "../../types";

/**
 * Tool name and description for createCalendarEvent
 */
export const createCalendarEventToolInfo = {
    name: "createCalendarEvent",
    description:
        'Create a new calendar event in Google Calendar. This creates a single (non-recurring) event.\n\nRequired fields:\n- summary: Title of the event\n- start: Start time in RFC3339 format (e.g., \'2023-12-25T10:00:00\')\n- end: End time in RFC3339 format (e.g., \'2023-12-25T11:00:00\')\n\nOptional fields:\n- calendarId: ID of the calendar (defaults to primary)\n- timeZone: Time zone for the event (e.g., \'America/New_York\')\n- description: Detailed description of the event\n- location: Where the event takes place\n- status: \'confirmed\', \'tentative\', or \'cancelled\'\n- colorId: Color ID for event display\n\nExample input for a doctor\'s appointment:\n```json\n{\n  "summary": "Doctor Appointment",\n  "start": "2023-11-15T09:30:00",\n  "end": "2023-11-15T10:30:00",\n  "timeZone": "America/Chicago",\n  "description": "Annual checkup with Dr. Smith",\n  "location": "123 Medical Center Blvd"\n}\n```\n\nFor recurring events, use the createRecurringEvent tool instead.',
};

/**
 * Input schema for the createCalendarEvent tool
 */
export const createCalendarEventInputSchema = z.object({
    calendarId: z
        .string()
        .optional()
        .describe("Calendar ID (defaults to primary calendar)"),
    summary: z.string().describe("Title of the event"),
    description: z.string().optional().describe("Description of the event"),
    location: z.string().optional().describe("Location of the event"),
    start: z
        .string()
        .describe("Start time in RFC3339 format (e.g., '2023-12-25T10:00:00')"),
    end: z
        .string()
        .describe("End time in RFC3339 format (e.g., '2023-12-25T11:00:00')"),
    timeZone: z
        .string()
        .optional()
        .describe("Time zone for the event (e.g., 'America/New_York')"),
    status: z
        .enum(["confirmed", "tentative", "cancelled"])
        .optional()
        .describe("Status of the event (defaults to confirmed)"),
    colorId: z.string().optional().describe("Color ID for event display"),
});

/**
 * Creates a handler function for the createCalendarEvent MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createCreateCalendarEventHandler(
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

            // Extract event parameters
            const {
                calendarId,
                summary,
                description,
                location,
                start,
                end,
                timeZone,
                status,
                colorId,
            } = params;

            // Validate required fields
            if (!summary) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "A summary (title) is required to create a calendar event.",
                        },
                    ],
                };
            }

            if (!start) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Start time is required to create a calendar event. Please provide a start value in RFC3339 format (e.g., '2023-12-25T10:00:00').",
                        },
                    ],
                };
            }

            if (!end) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "End time is required to create a calendar event. Please provide an end value in RFC3339 format (e.g., '2023-12-25T11:00:00').",
                        },
                    ],
                };
            }

            // Create the event object with the format expected by the API
            const event = {
                summary,
                description,
                location,
                start: {
                    dateTime: start,
                    timeZone:
                        timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                end: {
                    dateTime: end,
                    timeZone:
                        timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                status,
                colorId,
            };

            // Call the API to create the event
            console.log(
                `Creating event in calendar ${calendarId || "primary"}:`,
                event
            );
            const createdEvent = await apiClient.createCalendarEvent(
                calendarId,
                event
            );

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully created event "${createdEvent.summary
                            }" in calendar ${calendarId || "primary"}.`,
                    },
                    {
                        type: "text",
                        text: JSON.stringify(createdEvent, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error("Error in createCalendarEvent tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error creating calendar event: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}

/**
 * Tool name and description for createRecurringEvent
 */
export const createRecurringEventToolInfo = {
    name: "createRecurringEvent",
    description:
        'Create a daily recurring calendar event in Google Calendar. You must provide the event details (summary, start, end times in RFC3339 format). The event will repeat daily for the specified number of occurrences.\n\nRequired fields:\n- summary: Title of the event\n- start: Start time in RFC3339 format (e.g., \'2023-12-25T10:00:00\')\n- end: End time in RFC3339 format (e.g., \'2023-12-25T11:00:00\')\n\nOptional fields:\n- calendarId: ID of the calendar (defaults to primary)\n- timeZone: Time zone for the event (e.g., \'America/New_York\')\n- description: Detailed description of the event\n- location: Where the event takes place\n- status: \'confirmed\', \'tentative\', or \'cancelled\'\n- weekdaysOnly: If true, the event will only repeat on weekdays (Monday to Friday)\n- count: Number of occurrences (defaults to 10)\n\nExample input for a daily meeting for 5 occurrences on weekdays only:\n```json\n{\n  "summary": "Daily Standup",\n  "start": "2023-11-20T10:00:00",\n  "end": "2023-11-20T10:30:00",\n  "timeZone": "America/New_York",\n  "description": "Daily team sync",\n  "location": "Conference Room A",\n  "weekdaysOnly": true,\n  "count": 5\n}\n```',
};

/**
 * Input schema for the createRecurringEvent tool
 */
export const createRecurringEventInputSchema = z.object({
    calendarId: z
        .string()
        .optional()
        .describe("Calendar ID (defaults to primary calendar)"),
    summary: z.string().describe("Title of the event"),
    description: z.string().optional().describe("Description of the event"),
    location: z.string().optional().describe("Location of the event"),
    start: z
        .string()
        .describe("Start time in RFC3339 format (e.g., '2023-12-25T10:00:00')"),
    end: z
        .string()
        .describe("End time in RFC3339 format (e.g., '2023-12-25T11:00:00')"),
    timeZone: z
        .string()
        .optional()
        .describe("Time zone for the event (e.g., 'America/New_York')"),
    status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
    colorId: z.string().optional(),
    weekdaysOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe(
            "If true, the event will only repeat on weekdays (Monday to Friday)"
        ),
    count: z
        .number()
        .int()
        .positive()
        .optional()
        .default(10)
        .describe("Number of occurrences (defaults to 10)"),
});


/**
 * Creates a handler function for the createRecurringEvent MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createCreateRecurringEventHandler(
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
  
        // Extract parameters
        const {
          calendarId,
          summary,
          description,
          location,
          start,
          end,
          timeZone,
          status,
          colorId,
          weekdaysOnly = false,
          count = 10,
        } = params;
  
        // Validate required fields
        if (!summary) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "A summary (title) is required to create a recurring event.",
              },
            ],
          };
        }
  
        if (!start) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Start time is required to create a recurring event. Please provide a start value in RFC3339 format (e.g., '2023-12-25T10:00:00').",
              },
            ],
          };
        }
  
        if (!end) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "End time is required to create a recurring event. Please provide an end value in RFC3339 format (e.g., '2023-12-25T11:00:00').",
              },
            ],
          };
        }
  
        // Create the event object with the format expected by the API
        const event = {
          summary,
          description,
          location,
          start: {
            dateTime: start,
            timeZone:
              timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: end,
            timeZone:
              timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          status,
          colorId,
        };
  
        // Create the recurrence object from the simplified parameters
        const recurrence: {
          frequency: "DAILY";
          count: number;
          byDay?: string[];
        } = {
          frequency: "DAILY",
          count: count,
        };
  
        // Add byDay parameter if weekdaysOnly is true
        if (weekdaysOnly) {
          recurrence.byDay = ["MO", "TU", "WE", "TH", "FR"];
        }
  
        // Call the API to create the recurring event
        console.log(
          `Creating daily recurring event in calendar ${
            calendarId || "primary"
          }:`,
          { event, recurrence, weekdaysOnly, count }
        );
  
        const createdEvent = await apiClient.createRecurringEvent(
          calendarId,
          event,
          recurrence
        );
  
        // Return formatted response
        return {
          content: [
            {
              type: "text",
              text: `Successfully created daily recurring event "${
                createdEvent.summary
              }" in calendar ${
                calendarId || "primary"
              } with ${count} occurrences${
                weekdaysOnly ? " (weekdays only)" : ""
              }.`,
            },
            {
              type: "text",
              text: JSON.stringify(createdEvent, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error in createRecurringEvent tool:", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error creating recurring calendar event: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    };
  }

  export function registerCreateCalendarEventTool(server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>): void {
    server.registerTool(
      createCalendarEventToolInfo.name,
        {
            title: createCalendarEventToolInfo.name,
            description: createCalendarEventToolInfo.description,
            inputSchema: createCalendarEventInputSchema.shape
        },
        createCreateCalendarEventHandler(
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
export function registerCreateRecurringEventTool(server: McpServer,
  sessions: Map<string, SessionData>,
  clients: Map<string, any>): void {
  server.registerTool(
    createRecurringEventToolInfo.name,
      {
          title: createRecurringEventToolInfo.name,
          description: createRecurringEventToolInfo.description,
          inputSchema: createRecurringEventInputSchema.shape
      },
      createCreateRecurringEventHandler(
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