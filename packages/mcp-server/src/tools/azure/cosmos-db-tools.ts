import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

import { SessionData } from '../../types';
import { AzureCosmosService } from '@terapotik/shared/dist/services';
import { AzureCosmosConfig } from '@terapotik/shared/dist/types/azure-cosmos';
import { getSessionAuth } from '../auth-helper';
import { SessionAuthGetter, ClientGetter } from "../../types/mcp";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Azure Cosmos DB service instance
 */
async function getAzureCosmosService(): Promise<AzureCosmosService> {
    const config: AzureCosmosConfig = {
        connectionString: process.env.AZURE_COSMOS_CONNECTION_STRING!,
        databaseName: 'terapotik'
    };
    const cosmosService = new AzureCosmosService(config);
    await cosmosService.initialize();
    return cosmosService;
}

// ============================================================================
// 1. CREATE DOCUMENT TOOL
// ============================================================================

export const createDocumentToolInfo = {
    name: "create_document",
    description: "Create a new document in a Cosmos DB collection. The document will be automatically scoped to your user ID and include creation timestamps."
};

export const createDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection to create the document in (e.g., 'users', 'posts', 'orders')"),
    document: z.record(z.any())
        .describe("The document data to create. This should be a JSON object with the fields you want to store. The system will automatically add userId, createdAt, and updatedAt fields.")
});

export function createCreateDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof createDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.createDocument({
                collection: args.collection,
                document: args.document,
                userId
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to create document: ${result.error}`
                    }]
                };
            }

            const documentData = result.data as any;
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully created document in collection "${args.collection}"

📄 **Document Details:**
- **Document ID:** ${result.insertedId}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Created At:** ${documentData.createdAt}
- **Updated At:** ${documentData.updatedAt}

📋 **Document Data:**
\`\`\`json
${JSON.stringify(documentData, null, 2)}
\`\`\``
                }]
            };

        } catch (error) {
            console.error('Error in createDocument handler:', error);
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
// 2. GET DOCUMENT TOOL
// ============================================================================

export const getDocumentToolInfo = {
    name: "get_document",
    description: "Retrieve a specific document from a Cosmos DB collection by its ID. The document must belong to your user account."
};

export const getDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection to get the document from"),
    id: z.string()
        .min(1, "Document ID is required")
        .describe("The unique ID of the document to retrieve (MongoDB ObjectId)")
});

export function createGetDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof getDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.getDocument({
                collection: args.collection,
                id: args.id,
                userId
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to get document: ${result.error}`
                    }]
                };
            }

            const documentData = result.data as any;
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully retrieved document from collection "${args.collection}"

📄 **Document Details:**
- **Document ID:** ${args.id}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Created At:** ${documentData.createdAt || 'N/A'}
- **Updated At:** ${documentData.updatedAt || 'N/A'}

📋 **Document Data:**
\`\`\`json
${JSON.stringify(documentData, null, 2)}
\`\`\``
                }]
            };

        } catch (error) {
            console.error('Error in getDocument handler:', error);
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
// 3. UPDATE DOCUMENT TOOL
// ============================================================================

export const updateDocumentToolInfo = {
    name: "update_document",
    description: "Update an existing document in a Cosmos DB collection. Only documents belonging to your user account can be updated."
};

export const updateDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection containing the document to update"),
    id: z.string()
        .min(1, "Document ID is required")
        .describe("The unique ID of the document to update (MongoDB ObjectId)"),
    updates: z.record(z.any())
        .describe("The fields to update. This should be a JSON object with only the fields you want to change. The system will automatically update the updatedAt timestamp.")
});

export function createUpdateDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof updateDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.updateDocument({
                collection: args.collection,
                id: args.id,
                updates: args.updates,
                userId
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to update document: ${result.error}`
                    }]
                };
            }

            const documentData = result.data as any;
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully updated document in collection "${args.collection}"

📄 **Document Details:**
- **Document ID:** ${args.id}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Modified Count:** ${result.modifiedCount}
- **Updated At:** ${documentData?.updatedAt || 'N/A'}

📋 **Updated Document Data:**
\`\`\`json
${JSON.stringify(documentData, null, 2)}
\`\`\``
                }]
            };

        } catch (error) {
            console.error('Error in updateDocument handler:', error);
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
// 4. DELETE DOCUMENT TOOL
// ============================================================================

export const deleteDocumentToolInfo = {
    name: "delete_document",
    description: "Delete a document from a Cosmos DB collection. Only documents belonging to your user account can be deleted."
};

export const deleteDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection containing the document to delete"),
    id: z.string()
        .min(1, "Document ID is required")
        .describe("The unique ID of the document to delete (MongoDB ObjectId)")
});

export function createDeleteDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof deleteDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.deleteDocument({
                collection: args.collection,
                id: args.id,
                userId
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to delete document: ${result.error}`
                    }]
                };
            }

            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully deleted document from collection "${args.collection}"

📄 **Deletion Details:**
- **Document ID:** ${args.id}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Deleted Count:** ${result.deletedCount}`
                }]
            };

        } catch (error) {
            console.error('Error in deleteDocument handler:', error);
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
// 5. QUERY DOCUMENTS TOOL
// ============================================================================

export const queryDocumentsToolInfo = {
    name: "query_documents",
    description: "Query documents from a Cosmos DB collection with flexible filtering, sorting, and pagination options. Results are automatically scoped to your user account."
};

export const queryDocumentsInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection to query"),
    filter: z.record(z.any())
        .optional()
        .describe("MongoDB filter object to match documents (e.g., {status: 'active', category: 'news'}). Leave empty to get all documents."),
    limit: z.number()
        .min(1)
        .max(1000)
        .default(50)
        .describe("Maximum number of documents to return (1-1000, default: 50)"),
    skip: z.number()
        .min(0)
        .default(0)
        .describe("Number of documents to skip for pagination (default: 0)"),
    sort: z.record(z.any())
        .optional()
        .describe("Sort criteria (e.g., {createdAt: -1} for newest first, {name: 1} for alphabetical)")
});

export function createQueryDocumentsHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof queryDocumentsInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Build options
            const options: any = {
                limit: args.limit,
                skip: args.skip
            };
            if (args.sort) {
                options.sort = args.sort;
            }

            // Call the service
            const result = await cosmosService.queryDocuments({
                collection: args.collection,
                filter: args.filter || {},
                options,
                userId
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to query documents: ${result.error}`
                    }]
                };
            }

            const documents = result.data as any[];
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully queried documents from collection "${args.collection}"

📊 **Query Results:**
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Documents Found:** ${documents.length}
- **Limit:** ${args.limit}
- **Skip:** ${args.skip}
${args.sort ? `- **Sort:** ${JSON.stringify(args.sort)}` : ''}
${args.filter ? `- **Filter:** ${JSON.stringify(args.filter)}` : ''}

📋 **Documents:**
${documents.length === 0 ? 'No documents found matching the criteria.' : documents.map((doc, index) => `
**Document ${index + 1}:**
- **ID:** ${doc._id}
- **Created:** ${doc.createdAt || 'N/A'}
- **Updated:** ${doc.updatedAt || 'N/A'}
- **Data:** \`\`\`json
${JSON.stringify(doc, null, 2)}
\`\`\``).join('\n')}`
                }]
            };

        } catch (error) {
            console.error('Error in queryDocuments handler:', error);
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
// 6. AGGREGATE DATA TOOL
// ============================================================================

export const aggregateDataToolInfo = {
    name: "aggregate_data",
    description: "Perform advanced data aggregation operations on a Cosmos DB collection using MongoDB aggregation pipeline. Results are automatically scoped to your user account."
};

export const aggregateDataInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection to aggregate data from"),
    pipeline: z.array(z.record(z.any()))
        .min(1, "Pipeline must have at least one stage")
        .describe("MongoDB aggregation pipeline stages (e.g., [{$match: {status: 'active'}}, {$group: {_id: '$category', count: {$sum: 1}}}]")
});

export function createAggregateDataHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof aggregateDataInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.aggregateData({
                collection: args.collection,
                pipeline: args.pipeline,
                userId
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to aggregate data: ${result.error}`
                    }]
                };
            }

            const aggregatedData = result.data as any[];
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully aggregated data from collection "${args.collection}"

📊 **Aggregation Results:**
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Results Count:** ${aggregatedData.length}
- **Pipeline Stages:** ${args.pipeline.length}

📋 **Aggregated Data:**
${aggregatedData.length === 0 ? 'No results from aggregation pipeline.' : aggregatedData.map((item, index) => `
**Result ${index + 1}:**
\`\`\`json
${JSON.stringify(item, null, 2)}
\`\`\``).join('\n')}`
                }]
            };

        } catch (error) {
            console.error('Error in aggregateData handler:', error);
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
// 7. GET USER DOCUMENTS TOOL
// ============================================================================

export const getUserDocumentsToolInfo = {
    name: "get_user_documents",
    description: "Get all documents belonging to your user account from a specific collection. This is a simplified query tool that automatically filters by your user ID."
};

export const getUserDocumentsInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection to get documents from"),
    limit: z.number()
        .min(1)
        .max(1000)
        .default(50)
        .describe("Maximum number of documents to return (1-1000, default: 50)"),
    skip: z.number()
        .min(0)
        .default(0)
        .describe("Number of documents to skip for pagination (default: 0)"),
    sort: z.record(z.any())
        .optional()
        .describe("Sort criteria (e.g., {createdAt: -1} for newest first, {name: 1} for alphabetical)")
});

export function createGetUserDocumentsHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof getUserDocumentsInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Build options
            const options: any = {
                limit: args.limit,
                skip: args.skip
            };
            if (args.sort) {
                options.sort = args.sort;
            }

            // Call the service
            const result = await cosmosService.getUserDocuments({
                userId,
                collection: args.collection,
                options
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to get user documents: ${result.error}`
                    }]
                };
            }

            const documents = result.data as any[];
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully retrieved your documents from collection "${args.collection}"

📊 **User Documents:**
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Documents Found:** ${documents.length}
- **Limit:** ${args.limit}
- **Skip:** ${args.skip}
${args.sort ? `- **Sort:** ${JSON.stringify(args.sort)}` : ''}

📋 **Your Documents:**
${documents.length === 0 ? 'No documents found in this collection.' : documents.map((doc, index) => `
**Document ${index + 1}:**
- **ID:** ${doc._id}
- **Created:** ${doc.createdAt || 'N/A'}
- **Updated:** ${doc.updatedAt || 'N/A'}
- **Data:** \`\`\`json
${JSON.stringify(doc, null, 2)}
\`\`\``).join('\n')}`
                }]
            };

        } catch (error) {
            console.error('Error in getUserDocuments handler:', error);
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
// 8. CREATE USER DOCUMENT TOOL
// ============================================================================

export const createUserDocumentToolInfo = {
    name: "create_user_document",
    description: "Create a new document in a Cosmos DB collection that is automatically associated with your user account. This is a simplified version of create_document."
};

export const createUserDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection to create the document in"),
    document: z.record(z.any())
        .describe("The document data to create. This should be a JSON object with the fields you want to store.")
});

export function createCreateUserDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof createUserDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.createUserDocument({
                userId,
                collection: args.collection,
                document: args.document
            });

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to create user document: ${result.error}`
                    }]
                };
            }

            const documentData = result.data as any;
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully created user document in collection "${args.collection}"

📄 **Document Details:**
- **Document ID:** ${result.insertedId}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Created At:** ${documentData.createdAt}
- **Updated At:** ${documentData.updatedAt}

📋 **Document Data:**
\`\`\`json
${JSON.stringify(documentData, null, 2)}
\`\`\``
                }]
            };

        } catch (error) {
            console.error('Error in createUserDocument handler:', error);
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
// 9. UPDATE USER DOCUMENT TOOL
// ============================================================================

export const updateUserDocumentToolInfo = {
    name: "update_user_document",
    description: "Update an existing document that belongs to your user account. This is a simplified version of update_document."
};

export const updateUserDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection containing the document to update"),
    documentId: z.string()
        .min(1, "Document ID is required")
        .describe("The unique ID of the document to update (MongoDB ObjectId)"),
    updates: z.record(z.any())
        .describe("The fields to update. This should be a JSON object with only the fields you want to change.")
});

export function createUpdateUserDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof updateUserDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.updateUserDocument(
                userId,
                args.collection,
                args.documentId,
                args.updates
            );

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to update user document: ${result.error}`
                    }]
                };
            }

            const documentData = result.data as any;
            
            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully updated user document in collection "${args.collection}"

📄 **Document Details:**
- **Document ID:** ${args.documentId}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Modified Count:** ${result.modifiedCount}
- **Updated At:** ${documentData?.updatedAt || 'N/A'}

📋 **Updated Document Data:**
\`\`\`json
${JSON.stringify(documentData, null, 2)}
\`\`\``
                }]
            };

        } catch (error) {
            console.error('Error in updateUserDocument handler:', error);
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
// 10. DELETE USER DOCUMENT TOOL
// ============================================================================

export const deleteUserDocumentToolInfo = {
    name: "delete_user_document",
    description: "Delete a document that belongs to your user account. This is a simplified version of delete_document."
};

export const deleteUserDocumentInputSchema = z.object({
    collection: z.string()
        .min(1, "Collection name is required")
        .describe("The name of the collection containing the document to delete"),
    documentId: z.string()
        .min(1, "Document ID is required")
        .describe("The unique ID of the document to delete (MongoDB ObjectId)")
});

export function createDeleteUserDocumentHandler(
    sessionAuthGetter: SessionAuthGetter,
    clientGetter: ClientGetter
) {
    return async (args: z.infer<typeof deleteUserDocumentInputSchema>, context: any) => {
        try {
            // Get session authentication
            const authResult = await getSessionAuth(context, sessionAuthGetter);
            if (!authResult.success) {
                return authResult.errorResponse;
            }

            const { authInfo } = authResult;
            const userId = authInfo!.userId;

            // Get Azure Cosmos service
            const cosmosService = await getAzureCosmosService();

            // Call the service
            const result = await cosmosService.deleteUserDocument(
                userId,
                args.collection,
                args.documentId
            );

            if (!result.success) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Failed to delete user document: ${result.error}`
                    }]
                };
            }

            // Format response
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully deleted user document from collection "${args.collection}"

📄 **Deletion Details:**
- **Document ID:** ${args.documentId}
- **Collection:** ${args.collection}
- **User ID:** ${userId}
- **Deleted Count:** ${result.deletedCount}`
                }]
            };

        } catch (error) {
            console.error('Error in deleteUserDocument handler:', error);
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
// REGISTRATION FUNCTIONS
// ============================================================================

/**
 * Register the createDocument tool with the MCP server
 */
export function registerCreateDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        createDocumentToolInfo.name,
        {
            title: createDocumentToolInfo.name,
            description: createDocumentToolInfo.description,
            inputSchema: createDocumentInputSchema.shape
        },
        createCreateDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the getDocument tool with the MCP server
 */
export function registerGetDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        getDocumentToolInfo.name,
        {
            title: getDocumentToolInfo.name,
            description: getDocumentToolInfo.description,
            inputSchema: getDocumentInputSchema.shape
        },
        createGetDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the updateDocument tool with the MCP server
 */
export function registerUpdateDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        updateDocumentToolInfo.name,
        {
            title: updateDocumentToolInfo.name,
            description: updateDocumentToolInfo.description,
            inputSchema: updateDocumentInputSchema.shape
        },
        createUpdateDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the deleteDocument tool with the MCP server
 */
export function registerDeleteDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        deleteDocumentToolInfo.name,
        {
            title: deleteDocumentToolInfo.name,
            description: deleteDocumentToolInfo.description,
            inputSchema: deleteDocumentInputSchema.shape
        },
        createDeleteDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the queryDocuments tool with the MCP server
 */
export function registerQueryDocumentsTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        queryDocumentsToolInfo.name,
        {
            title: queryDocumentsToolInfo.name,
            description: queryDocumentsToolInfo.description,
            inputSchema: queryDocumentsInputSchema.shape
        },
        createQueryDocumentsHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the aggregateData tool with the MCP server
 */
export function registerAggregateDataTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        aggregateDataToolInfo.name,
        {
            title: aggregateDataToolInfo.name,
            description: aggregateDataToolInfo.description,
            inputSchema: aggregateDataInputSchema.shape
        },
        createAggregateDataHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the getUserDocuments tool with the MCP server
 */
export function registerGetUserDocumentsTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        getUserDocumentsToolInfo.name,
        {
            title: getUserDocumentsToolInfo.name,
            description: getUserDocumentsToolInfo.description,
            inputSchema: getUserDocumentsInputSchema.shape
        },
        createGetUserDocumentsHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the createUserDocument tool with the MCP server
 */
export function registerCreateUserDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        createUserDocumentToolInfo.name,
        {
            title: createUserDocumentToolInfo.name,
            description: createUserDocumentToolInfo.description,
            inputSchema: createUserDocumentInputSchema.shape
        },
        createCreateUserDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the updateUserDocument tool with the MCP server
 */
export function registerUpdateUserDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        updateUserDocumentToolInfo.name,
        {
            title: updateUserDocumentToolInfo.name,
            description: updateUserDocumentToolInfo.description,
            inputSchema: updateUserDocumentInputSchema.shape
        },
        createUpdateUserDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register the deleteUserDocument tool with the MCP server
 */
export function registerDeleteUserDocumentTool(
    server: McpServer,
    sessions: Map<string, SessionData>,
    clients: Map<string, any>
): void {
    server.registerTool(
        deleteUserDocumentToolInfo.name,
        {
            title: deleteUserDocumentToolInfo.name,
            description: deleteUserDocumentToolInfo.description,
            inputSchema: deleteUserDocumentInputSchema.shape
        },
        createDeleteUserDocumentHandler(
            (sessionId) => {
                const sessionData = sessions.get(sessionId);
                return sessionData?.authInfo || null;
            },
            (clientId) => {
                return clients.get(clientId) || null;
            }
        )
    );
}

/**
 * Register all Azure Cosmos DB tools with the MCP server
 */
export function registerAzureCosmosTools(server: McpServer, sessions: Map<string, SessionData>, clients: Map<string, any>): void {
    registerCreateDocumentTool(server, sessions, clients);
    registerGetDocumentTool(server, sessions, clients);
    registerUpdateDocumentTool(server, sessions, clients);
    registerDeleteDocumentTool(server, sessions, clients);
    registerQueryDocumentsTool(server, sessions, clients);
    registerAggregateDataTool(server, sessions, clients);
    registerGetUserDocumentsTool(server, sessions, clients);
    registerCreateUserDocumentTool(server, sessions, clients);
    registerUpdateUserDocumentTool(server, sessions, clients);
    registerDeleteUserDocumentTool(server, sessions, clients);
}
