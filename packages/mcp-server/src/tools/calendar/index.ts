import { TerapotikApiClient } from "../../services/terapotik-api-client";
import { TokenService } from "../../services/token-service";
import { ClientGetter, SessionAuthGetter } from "../../types/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { SessionData } from "../../types";
import { registerGetCalendarEventsTool, registerGetCalendarListTool, registerGetEventsForDateRangeTool, registerGetEventsForDateTool, registerGetEventsForTodayTool } from "./get-calendar-events";
import { registerCreateCalendarEventTool, registerCreateRecurringEventTool } from "./create-calendar-event";

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



export function registerCalendarTools(mcpServer: McpServer, sessions: Map<string, SessionData>, clients: Map<string, any>) {
  registerGetEventsForTodayTool(mcpServer, sessions, clients);
  registerGetCalendarListTool(mcpServer, sessions, clients);
  registerGetCalendarEventsTool(mcpServer, sessions, clients);
  registerGetEventsForDateTool(mcpServer, sessions, clients);
  registerGetEventsForDateRangeTool(mcpServer, sessions, clients);
  registerCreateCalendarEventTool(mcpServer, sessions, clients);
  registerCreateRecurringEventTool(mcpServer, sessions, clients);
}
