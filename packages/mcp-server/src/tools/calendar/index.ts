import { z } from "zod";
import { TerapotikApiClient } from "../../services/terapotik-api-client";
import { TokenService } from "../../services/token-service";
import { ClientGetter, McpToolHandler, SessionAuthGetter } from "../../types/mcp";

/**
 * Tool name and description for getEventsForToday
 */
export const getEventsForTodayToolInfo = {
    name: "getEventsForToday",
    description:
        "Fetch calendar events for today from Google Calendar. This returns all events scheduled for the current day. You can optionally specify a calendar ID if you want to fetch events from a calendar other than the primary one.",
};


/**
 * Input schema for the getEventsForToday tool
 */
export const getEventsForTodayInputSchema = z.object({
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
 * Creates a handler function for the getEventsForToday MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetEventsForTodayHandler(
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

            // Get today's date in YYYY-MM-DD format
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            // Parse parameters
            const queryParams = {
                calendarId: params.calendarId,
                maxResults: params.maxResults || 100,
            };

            // Fetch events for today from the API
            console.log(
                `Fetching events for today (${dateStr}) with params:`,
                queryParams
            );
            const events = await apiClient.getEventsForDate(dateStr, queryParams);

            // Format event data as pretty-printed text
            const formattedEventData = JSON.stringify(events, null, 2);

            // Return formatted response
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully retrieved ${events.items.length} events for today (${dateStr}).`,
                    },
                    {
                        type: "text",
                        text: formattedEventData,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in getEventsForToday tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving events for today: ${error instanceof Error ? error.message : "Unknown error"
                            }`,
                    },
                ],
            };
        }
    };
}

/**
 * Creates a handler function for the getCalendarEvents MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createGetCalendarEventsHandler(
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
  
        // Parse parameters
        const eventsParams = {
          calendarId: params.calendarId,
          timeMin: params.timeMin,
          timeMax: params.timeMax,
          maxResults: params.maxResults,
          singleEvents:
            params.singleEvents !== undefined ? params.singleEvents : true,
          orderBy: params.orderBy || "startTime",
        };
  
        // Fetch events from the API
        console.log("Calling API with params:", eventsParams);
        const events = await apiClient.getCalendarEvents(eventsParams);
  
        // Format event data as pretty-printed text
        const formattedEventData = JSON.stringify(events, null, 2);
  
        // Return formatted response
        return {
          content: [
            {
              type: "text",
              text: `Successfully retrieved ${events.items.length} events.`,
            },
            {
              type: "text",
              text: formattedEventData,
            },
          ],
        };
      } catch (error) {
        console.error("Error in getCalendarEvents tool:", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error retrieving calendar events: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    };
  }

  /**
 * Helper function to handle common authentication and token validation
 * @param context The context object containing sessionId
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns Object containing result (success or error) and if success, the API client and other info
 */
export async function authenticateAndGetClient(
    context: any,
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
  ): Promise<{
    success: boolean;
    apiClient?: TerapotikApiClient;
    errorResponse?: any;
    accessToken?: string;
  }> {
    // Get session ID from context
    const sessionId = context?.sessionId;
  
    if (!sessionId) {
      console.log("No session ID found in context:", context);
      return {
        success: false,
        errorResponse: {
          content: [
            {
              type: "text",
              text: "No session ID available. Authentication required.",
            },
          ],
        },
      };
    }
  
    // Look up auth info by session ID
    const authInfo = sessionAuthGetter(sessionId);
  
    if (!authInfo) {
      console.log(`No auth info found for session ID ${sessionId}`);
      return {
        success: false,
        errorResponse: {
          content: [
            {
              type: "text",
              text: "You are not authenticated. Please authenticate first.",
            },
          ],
        },
      };
    }
  
    // Get the client from the clients map
    const client = clientGetter(authInfo.clientId);
  
    if (!client) {
      console.log(`No client found for client ID ${authInfo.clientId}`);
      return {
        success: false,
        errorResponse: {
          content: [
            {
              type: "text",
              text: "Client information not found. Please re-authenticate.",
            },
          ],
        },
      };
    }
  
    // Get token data from tokens property
    const tokenInfo = client?.tokens || {};
    let accessToken = tokenInfo.access_token;
  
    // Use TokenService to validate the token format
    let isTokenValid = TokenService.validateTokenFormat(accessToken);
  
    if (!isTokenValid) {
      console.log("Token validation failed, returning 401");
      return {
        success: false,
        errorResponse: {
          content: [
            {
              type: "text",
              text: "Your authentication token is invalid or expired. Please authenticate again.",
            },
          ],
        },
      };
    }
  
    console.log(
      `Using access token for API call: ${accessToken.substring(0, 10)}...`
    );
  
    // Create and return the API client
    const apiClient = new TerapotikApiClient(accessToken);
    return { success: true, apiClient, accessToken };
  }