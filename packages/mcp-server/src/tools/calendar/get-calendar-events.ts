import { z } from "zod";
import { authenticateAndGetClient } from ".";
import { ClientGetter, McpToolHandler, SessionAuthGetter } from "../../types/mcp";

/**
 * Tool name and description for getCalendarEvents
 */
export const getCalendarEventsToolInfo = {
    name: "getCalendarEvents",
    description:
        "Fetch calendar events with optional filter parameters. You can specify a time range, maximum number of results, and other filter options. If no parameters are provided, it will fetch events from the primary calendar for the next few days.",
};

/**
 * Input schema for the getCalendarEvents tool
 */
export const getCalendarEventsInputSchema = z.object({
    calendarId: z
        .string()
        .optional()
        .describe("Calendar ID (defaults to primary calendar)"),
    maxResults: z
        .number()
        .positive()
        .optional()
        .describe("Maximum number of events to return"),
    singleEvents: z
        .boolean()
        .optional()
        .describe("Whether to expand recurring events into instances"),
    orderBy: z
        .string()
        .optional()
        .describe("Sort order ('startTime' or 'updated')"),
    timeMin: z
        .string()
        .optional()
        .describe("Start time of the event range (RFC3339)"),
    timeMax: z
        .string()
        .optional()
        .describe("End time of the event range (RFC3339)"),
});

/**
 * Tool name and description for getEventsForDate
 */
export const getEventsForDateToolInfo = {
    name: "getEventsForDate",
    description:
        "Fetch calendar events for a specific date from Google Calendar. You must provide the date in YYYY-MM-DD format (e.g., 2023-12-25). This returns all events scheduled for that day.",
};

/**
* Input schema for the getEventsForDate tool
*/
export const getEventsForDateInputSchema = z.object({
    date: z.string().describe("Date in YYYY-MM-DD format"),
    calendarId: z
        .string()
        .optional()
        .describe("Calendar ID (defaults to primary calendar)"),
    maxResults: z
        .number()
        .positive()
        .optional()
        .describe("Maximum number of events to return"),
});


/**
 * Creates a handler function for the getEventsForDate MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetEventsForDateHandler(
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

            // Ensure we have a date
            const { date } = params;
            if (!date) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "A date in YYYY-MM-DD format is required to fetch events.",
                        },
                    ],
                };
            }

            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2023-12-25).",
                        },
                    ],
                };
            }

            // Parse parameters
            const queryParams = {
                calendarId: params.calendarId,
                maxResults: params.maxResults || 100,
            };

            // Fetch events for the specified date from the API
            console.log(`Fetching events for date ${date} with params:`, queryParams);
            const events = await apiClient.getEventsForDate(date, queryParams);

            // Format event data as pretty-printed text
            const formattedEventData = JSON.stringify(events, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${events.items.length} events for ${date}.`,
                    },
                    {
                        type: "text",
                        text: formattedEventData,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getEventsForDate tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving events for date: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}


/**
* Tool name and description for getCalendarList
*/
export const getCalendarListToolInfo = {
    name: "getCalendarList",
    description:
        "Fetch all available calendars from Google Calendar. This returns a list of calendars the user has access to, with their IDs and access roles. You need these calendar IDs to fetch events or create new events in specific calendars.",
};


/**
 * Input schema for the getCalendarList tool
 */
export const getCalendarListInputSchema = z.object({});



/**
 * Creates a handler function for the getCalendarList MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetCalendarListHandler(
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

            // Fetch calendar list from the API
            console.log("Fetching calendar list");
            const calendarList = await apiClient.getCalendarList();

            // Format calendar list as pretty-printed text
            const formattedCalendarList = JSON.stringify(calendarList, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${calendarList.items.length} calendars.`,
                    },
                    {
                        type: "text",
                        text: formattedCalendarList,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getCalendarList tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving calendar list: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}

/**
 * Tool name and description for getEventsForDateRange
 */
export const getEventsForDateRangeToolInfo = {
    name: "getEventsForDateRange",
    description:
        "Fetch calendar events for a specific date range from Google Calendar. You must provide both the start date and end date in YYYY-MM-DD format. This returns all events scheduled within the specified date range, inclusive of both start and end dates.",
};



/**
 * Input schema for the getEventsForDateRange tool
 */
export const getEventsForDateRangeInputSchema = z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    calendarId: z
        .string()
        .optional()
        .describe("Calendar ID (defaults to primary calendar)"),
    maxResults: z
        .number()
        .positive()
        .optional()
        .describe("Maximum number of events to return"),
});

/**
 * Creates a handler function for the getEventsForDateRange MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetEventsForDateRangeHandler(
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

            // Ensure we have startDate and endDate
            const { startDate, endDate } = params;
            if (!startDate || !endDate) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Both startDate and endDate in YYYY-MM-DD format are required to fetch events for a date range.",
                        },
                    ],
                };
            }

            // Validate date formats
            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
            ) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Invalid date format. Please use YYYY-MM-DD format for both startDate and endDate.",
                        },
                    ],
                };
            }

            // Parse parameters
            const queryParams = {
                calendarId: params.calendarId,
                maxResults: params.maxResults || 500,
            };

            // Fetch events for the specified date range from the API
            console.log(
                `Fetching events for date range ${startDate} to ${endDate} with params:`,
                queryParams
            );
            const events = await apiClient.getEventsForDateRange(
                startDate,
                endDate,
                queryParams
            );

            // Format event data as pretty-printed text
            const formattedEventData = JSON.stringify(events, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${events.items.length} events for the date range ${startDate} to ${endDate}.`,
                    },
                    {
                        type: "text",
                        text: formattedEventData,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getEventsForDateRange tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving events for date range: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}

