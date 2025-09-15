import { z } from "zod";
import { McpToolHandler, SessionAuthGetter, ClientGetter } from "../../types/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { SessionData } from "../../types";
import { getSessionAuth, getAzureStorageService } from "../auth-helper";

/**
 * Tool name and description for saveArtifact
 */
export const saveArtifactToolInfo = {
    name: "saveArtifact",
    description: "Save a file/artifact to Azure Storage. This tool automatically adds a date prefix (YYYYMMDD) to your filename for versioning. Files can be saved as private (user-scoped) or public (accessible via direct URL). Perfect for storing documents, notes, JSON data, or any text content. The system automatically detects content type from file extension if not specified.",
};

/**
 * Input schema for the saveArtifact tool
 */
export const saveArtifactInputSchema = z.object({
    fileName: z.string()
        .min(1, "File name is required")
        .describe("Name of the file (e.g., 'document.md', 'data.json'). The system will automatically add a date prefix in YYYYMMDD format, so 'document.md' becomes '20250914_document.md'"),
    content: z.string()
        .min(1, "Content cannot be empty")
        .describe("The actual content/text of the file as a string"),
    contentType: z.string()
        .optional()
        .default("text/markdown")
        .describe("MIME type of the content. Defaults to 'text/markdown' if not specified. Common types: 'text/markdown', 'text/plain', 'application/json', 'text/html'"),
    isPublic: z.boolean()
        .optional()
        .default(false)
        .describe("Whether the artifact should be publicly accessible via URL. Defaults to false (private storage). Public files are stored in a different folder and accessible via direct URL"),
    tags: z.record(z.string())
        .optional()
        .describe("Optional metadata tags as key-value pairs for additional file information (e.g., {category: 'notes', priority: 'high'})")
});

/**
 * Creates a handler function for the saveArtifact MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createSaveArtifactHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
): McpToolHandler {
    return async (params: any, context: any) => {
        try {
            // Get session auth info
            const auth = await getSessionAuth(context, sessionAuthGetter);
            if (!auth.success) {
                return auth.errorResponse;
            }

            const { userId } = auth.authInfo!;

            // Validate input parameters
            const validatedParams = saveArtifactInputSchema.parse(params);
            const { fileName, content, contentType, isPublic, tags } = validatedParams;

            // Get initialized Azure Storage service
            const storageService = await getAzureStorageService();

            // Save the artifact
            console.log(`Saving artifact for user ${userId}: ${fileName}`);
            const result = await storageService.saveArtifact({
                userId,
                fileName,
                content,
                contentType,
                isPublic,
                tags
            });

            if (!result.success) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Failed to save artifact: ${result.error}`,
                        },
                    ],
                };
            }

            // Format response
            const artifactInfo = result.data!;
            const responseText = `Successfully saved artifact "${artifactInfo.originalName}" for user "${userId}".

File Details:
- Original Name: ${artifactInfo.originalName}
- File Name: ${artifactInfo.fileName}
- Size: ${artifactInfo.size} bytes
- Content Type: ${artifactInfo.contentType}
- Is Public: ${artifactInfo.isPublic}
- Version: ${artifactInfo.version}
- Last Modified: ${artifactInfo.lastModified}

${artifactInfo.isPublic ? `Public URL: ${(artifactInfo as any).publicUrl || 'N/A'}` : 'This is a private artifact.'}`;

            return {
                content: [
                    {
                        type: "text",
                        text: responseText,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in saveArtifact tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error saving artifact: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                ],
            };
        }
    };
}

/**
 * Tool name and description for listArtifacts
 */
export const listArtifactsToolInfo = {
    name: "listArtifacts",
    description: "List all artifacts/files stored in Azure Storage for the current user. You can filter by filename prefix, include archived files, and limit the number of results. Perfect for browsing your stored documents, notes, and files.",
};

/**
 * Input schema for the listArtifacts tool
 */
export const listArtifactsInputSchema = z.object({
    prefix: z.string()
        .optional()
        .describe("Filter artifacts by filename prefix (e.g., 'doc' will find 'document.md', 'doc1.txt', etc.). Leave empty to list all artifacts"),
    includeArchived: z.boolean()
        .optional()
        .default(false)
        .describe("Whether to include archived/old versions of files. Defaults to false (only show current versions)"),
    maxResults: z.number()
        .positive()
        .optional()
        .default(50)
        .describe("Maximum number of artifacts to return. Defaults to 50. Use higher numbers for comprehensive listings")
});

/**
 * Creates a handler function for the listArtifacts MCP tool
 * @param sessionAuthGetter Function to get auth info from a session ID
 * @param clientGetter Function to get client info from a client ID
 * @returns An MCP tool handler function
 */
export function createListArtifactsHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
): McpToolHandler {
    return async (params: any, context: any) => {
        try {
            // Get session auth info
            const auth = await getSessionAuth(context, sessionAuthGetter);
            if (!auth.success) {
                return auth.errorResponse;
            }

            const { userId } = auth.authInfo!;

            // Validate input parameters
            const validatedParams = listArtifactsInputSchema.parse(params);
            const { prefix, includeArchived, maxResults } = validatedParams;

            // Get initialized Azure Storage service
            const storageService = await getAzureStorageService();

            // List artifacts
            console.log(`Listing artifacts for user ${userId} with prefix: ${prefix || 'all'}`);
            const result = await storageService.listArtifacts({
                userId,
                prefix,
                includeArchived,
                maxResults
            });

            if (!result.success) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Failed to list artifacts: ${result.error}`,
                        },
                    ],
                };
            }

            // Format response
            const artifacts = result.data || [];
            const responseText = `Found ${artifacts.length} artifact(s) for user "${userId}".

${artifacts.length === 0 
    ? 'No artifacts found. Use saveArtifact to create your first file!'
    : artifacts.map(artifact => 
        `📄 **${artifact.originalName}** (${artifact.fileName})
   - Size: ${artifact.size} bytes
   - Type: ${artifact.contentType}
   - Public: ${artifact.isPublic ? 'Yes' : 'No'}
   - Modified: ${artifact.lastModified}
   - Version: ${artifact.version}
   ${artifact.isPublic ? `   - URL: ${(artifact as any).publicUrl || 'N/A'}` : ''}
   ${artifact.tags ? `   - Tags: ${Object.entries(artifact.tags).map(([k, v]) => `${k}=${v}`).join(', ')}` : ''}`
      ).join('\n\n')
}`;

            return {
                content: [
                    {
                        type: "text",
                        text: responseText,
                    },
                ],
            };
        } catch (error) {
            console.error("Error in listArtifacts tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error listing artifacts: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                ],
            };
        }
    };
}

/**
 * Register the saveArtifact tool with the MCP server
 */
export function registerSaveArtifactTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        saveArtifactToolInfo.name,
        {
            title: saveArtifactToolInfo.name,
            description: saveArtifactToolInfo.description,
            inputSchema: saveArtifactInputSchema.shape
        },
        createSaveArtifactHandler(
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

/**
 * Register the listArtifacts tool with the MCP server
 */
export function registerListArtifactsTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        listArtifactsToolInfo.name,
        {
            title: listArtifactsToolInfo.name,
            description: listArtifactsToolInfo.description,
            inputSchema: listArtifactsInputSchema.shape
        },
        createListArtifactsHandler(
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

// ============================================================================
// 3. DELETE ARTIFACT TOOL
// ============================================================================

export const deleteArtifactToolInfo = {
    name: "delete_artifact",
    description: "Delete an artifact from Azure Storage. Can delete specific versions or all versions of a file."
};

export const deleteArtifactInputSchema = z.object({
    fileName: z.string()
        .min(1, "File name is required")
        .describe("The original name of the file to delete (without date prefix)"),
    deleteAllVersions: z.boolean()
        .default(false)
        .describe("Whether to delete all versions of the file (including archived versions). If false, only deletes the most recent version.")
});

export function createDeleteArtifactHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof deleteArtifactInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Storage service
            const storageService = await getAzureStorageService();

            // Call the service
            const result = await storageService.deleteArtifact({
                userId,
                fileName: args.fileName,
                deleteAllVersions: args.deleteAllVersions
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to delete artifact: ${result.error}`
                    }]
                };
            }

            // Format response
            const versionText = args.deleteAllVersions ? "all versions" : "current version";
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully deleted ${versionText} of artifact "${args.fileName}" for user ${userId}`
                }]
            };

        } catch (error) {
            console.error('Error in deleteArtifact handler:', error);
            return {
                content: [{
                    type: "text",
                    text: `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };
}

// ============================================================================
// 4. UPDATE ARTIFACT TOOL
// ============================================================================

export const updateArtifactToolInfo = {
    name: "update_artifact",
    description: "Update an existing artifact in Azure Storage. The old version will be archived automatically."
};

export const updateArtifactInputSchema = z.object({
    fileName: z.string()
        .min(1, "File name is required")
        .describe("The original name of the file to update (without date prefix)"),
    content: z.string()
        .min(1, "Content is required")
        .describe("The new content for the file"),
    contentType: z.string()
        .default("text/markdown")
        .describe("MIME type of the content (e.g., 'text/markdown', 'application/json', 'text/plain')"),
    archiveExisting: z.boolean()
        .default(true)
        .describe("Whether to archive the existing version before updating. If false, the old version will be permanently deleted.")
});

export function createUpdateArtifactHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof updateArtifactInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Storage service
            const storageService = await getAzureStorageService();

            // Call the service
            const result = await storageService.updateArtifact({
                userId,
                fileName: args.fileName,
                content: args.content,
                contentType: args.contentType,
                archiveExisting: args.archiveExisting
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to update artifact: ${result.error}`
                    }]
                };
            }

            const artifactInfo = result.data as any;
            const archiveText = args.archiveExisting ? " (previous version archived)" : " (previous version deleted)";
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully updated artifact "${args.fileName}"${archiveText}

📄 **File Details:**
- **Original Name:** ${artifactInfo.originalName}
- **Stored Name:** ${artifactInfo.fileName}
- **Size:** ${artifactInfo.size} bytes
- **Content Type:** ${artifactInfo.contentType}
- **Last Modified:** ${artifactInfo.lastModified.toISOString()}
- **Version:** ${artifactInfo.version || 'N/A'}
- **Status:** ${artifactInfo.isArchived ? 'Archived' : 'Active'}
- **Public URL:** ${artifactInfo.publicUrl || 'Private'}

${artifactInfo.tags && Object.keys(artifactInfo.tags).length > 0 ? `🏷️ **Tags:** ${Object.entries(artifactInfo.tags).map(([key, value]) => `${key}=${value}`).join(', ')}` : ''}`
                }]
            };

        } catch (error) {
            console.error('Error in updateArtifact handler:', error);
            return {
                content: [{
                    type: "text",
                    text: `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };
}


/**
 * Register the deleteArtifact tool with the MCP server
 */
export function registerDeleteArtifactTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        deleteArtifactToolInfo.name,
        {
            title: deleteArtifactToolInfo.name,
            description: deleteArtifactToolInfo.description,
            inputSchema: deleteArtifactInputSchema.shape
        },
        createDeleteArtifactHandler(
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

/**
 * Register the updateArtifact tool with the MCP server
 */
export function registerUpdateArtifactTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        updateArtifactToolInfo.name,
        {
            title: updateArtifactToolInfo.name,
            description: updateArtifactToolInfo.description,
            inputSchema: updateArtifactInputSchema.shape
        },
        createUpdateArtifactHandler(
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

// ============================================================================
// 5. SET ACCESS LEVEL TOOL
// ============================================================================

export const setAccessLevelToolInfo = {
    name: "set_access_level",
    description: "Change the access level of an artifact between public and private. When set to public, returns a shareable URL that can be accessed by anyone."
};

export const setAccessLevelInputSchema = z.object({
    fileName: z.string()
        .min(1, "File name is required")
        .describe("The original name of the file (without date prefix). Use list_artifacts first to see available files and their original names."),
    isPublic: z.boolean()
        .describe("Set to true to make the file publicly accessible (returns a shareable URL), false to make it private (only you can access it)")
});

export function createSetAccessLevelHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof setAccessLevelInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Storage service
            const storageService = await getAzureStorageService();

            // Call the service
            const result = await storageService.setAccessLevel({
                userId,
                fileName: args.fileName,
                isPublic: args.isPublic
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to set access level: ${result.error}`
                    }]
                };
            }

            const artifactInfo = result.data as any;
            const accessText = args.isPublic ? "public" : "private";
            const urlText = args.isPublic ? `\n🌐 **Public URL:** ${artifactInfo.publicUrl}` : "\n🔒 **Access:** Private (only you can access)";
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully set artifact "${args.fileName}" to ${accessText}${urlText}

📄 **File Details:**
- **Original Name:** ${artifactInfo.originalName}
- **Stored Name:** ${artifactInfo.fileName}
- **Size:** ${artifactInfo.size} bytes
- **Content Type:** ${artifactInfo.contentType}
- **Last Modified:** ${artifactInfo.lastModified.toISOString()}
- **Version:** ${artifactInfo.version || 'N/A'}
- **Status:** ${artifactInfo.isArchived ? 'Archived' : 'Active'}
- **Access Level:** ${artifactInfo.isPublic ? 'Public' : 'Private'}

${artifactInfo.tags && Object.keys(artifactInfo.tags).length > 0 ? `🏷️ **Tags:** ${Object.entries(artifactInfo.tags).map(([key, value]) => `${key}=${value}`).join(', ')}` : ''}`
                }]
            };

        } catch (error) {
            console.error('Error in setAccessLevel handler:', error);
            return {
                content: [{
                    type: "text",
                    text: `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };
}

// ============================================================================
// 6. GET ARTIFACT CONTENT TOOL
// ============================================================================

export const getArtifactContentToolInfo = {
    name: "get_artifact_content",
    description: "Retrieve the actual content of an artifact. Use list_artifacts first to see available files, then use the original name here to get the content."
};

export const getArtifactContentInputSchema = z.object({
    fileName: z.string()
        .min(1, "File name is required")
        .describe("The original name of the file (without date prefix). Use list_artifacts first to see available files and their original names. The system will search through active, archived, and public folders.")
});

export function createGetArtifactContentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof getArtifactContentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Storage service
            const storageService = await getAzureStorageService();

            // Call the service
            const result = await storageService.getArtifactContent(userId, args.fileName);

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to get artifact content: ${result.error}`
                    }]
                };
            }

            const content = result.data as string;
            
            // Format response with content preview
            const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
            const fullContent = content.length > 500 ? '\n\n📄 **Full Content:**\n```\n' + content + '\n```' : '';
            
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully retrieved content for artifact "${args.fileName}"

📄 **Content Preview:**
\`\`\`
${preview}
\`\`\`

📊 **Content Stats:**
- **Length:** ${content.length} characters
- **Lines:** ${content.split('\n').length} lines
- **Words:** ${content.split(/\s+/).filter(word => word.length > 0).length} words${fullContent}`
                }]
            };

        } catch (error) {
            console.error('Error in getArtifactContent handler:', error);
            return {
                content: [{
                    type: "text",
                    text: `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };
}

/**
 * Register the setAccessLevel tool with the MCP server
 */
export function registerSetAccessLevelTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        setAccessLevelToolInfo.name,
        {
            title: setAccessLevelToolInfo.name,
            description: setAccessLevelToolInfo.description,
            inputSchema: setAccessLevelInputSchema.shape
        },
        createSetAccessLevelHandler(
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

/**
 * Register the getArtifactContent tool with the MCP server
 */
export function registerGetArtifactContentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        getArtifactContentToolInfo.name,
        {
            title: getArtifactContentToolInfo.name,
            description: getArtifactContentToolInfo.description,
            inputSchema: getArtifactContentInputSchema.shape
        },
        createGetArtifactContentHandler(
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

export function registerAzureStorageTools(server: McpServer, sessions: Map<string, SessionData>, clients: Map<string, any>): void {
    registerSaveArtifactTool(server, sessions, clients);
    registerListArtifactsTool(server, sessions, clients);
    registerDeleteArtifactTool(server, sessions, clients);
    registerUpdateArtifactTool(server, sessions, clients);
    registerSetAccessLevelTool(server, sessions, clients);
    registerGetArtifactContentTool(server, sessions, clients);
}