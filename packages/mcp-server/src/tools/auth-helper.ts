import { SessionAuthGetter } from "../types/mcp";
import { AzureStorageService } from "@terapotik/shared/dist/services";
import { AzureStorageConfig } from "@terapotik/shared/dist/types/azure-storage";

/**
 * Helper function to get session auth info from context
 * @param context - The MCP context object
 * @param sessionAuthGetter - Function to get auth info from session ID
 * @returns Object with success status and auth info or error response
 */
export async function getSessionAuth(
    context: any,
    sessionAuthGetter: SessionAuthGetter
): Promise<{
    success: boolean;
    authInfo?: {
        userId: string;
        clientId: string;
        token: string;
        client: any;
    };
    errorResponse?: any;
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

    return {
        success: true,
        authInfo
    };
}

/**
 * Helper function to get initialized Azure Storage service
 * @returns Initialized Azure Storage service
 */
export async function getAzureStorageService(): Promise<AzureStorageService> {
    const config: AzureStorageConfig = {
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'artifacts'
    };
    
    const storageService = new AzureStorageService(config);
    await storageService.initialize();
    
    return storageService;
}
