import { MongoClient, Db, Collection, Document, ObjectId, Filter, UpdateFilter, FindOptions } from 'mongodb';
import {
    AzureCosmosConfig,
    CreateDocumentParams,
    GetDocumentParams,
    UpdateDocumentParams,
    DeleteDocumentParams,
    QueryDocumentsParams,
    AggregateDataParams,
    UserScopedQueryParams,
    UserScopedCreateParams,
    CosmosServiceResult,
    CosmosDocument
} from '../types/azure-cosmos';
import {
    createDocumentSchema,
    getDocumentSchema,
    updateDocumentSchema,
    deleteDocumentSchema,
    queryDocumentsSchema,
    aggregateDataSchema,
    userScopedQuerySchema,
    userScopedCreateSchema,
    azureCosmosConfigSchema
} from '../schemas/azure-cosmos.schema';

export class AzureCosmosService {
    private client: MongoClient;
    private db: Db;
    private config: AzureCosmosConfig;
    private isConnected: boolean = false;

    constructor(config: AzureCosmosConfig) {
        // Validate configuration
        const validatedConfig = azureCosmosConfigSchema.parse(config);
        this.config = validatedConfig;

        // Initialize MongoDB client
        this.client = new MongoClient(this.config.connectionString, {
            retryWrites: false, // Required for Cosmos DB
            maxIdleTimeMS: 120000,
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000
        });

        // Get database reference
        this.db = this.client.db(this.config.databaseName);
    }

    /**
     * Initialize the service - connect to MongoDB
     */
    async initialize(): Promise<void> {
        try {
            await this.client.connect();

            // Test the connection
            await this.db.admin().ping();
            this.isConnected = true;

            console.log(`Azure Cosmos DB connected to database "${this.config.databaseName}"`);
        } catch (error) {
            console.error('Failed to initialize Azure Cosmos DB:', error);
            throw new Error(`Azure Cosmos DB initialization failed: ${error}`);
        }
    }

    /**
     * Close the connection
     */
    async close(): Promise<void> {
        try {
            await this.client.close();
            this.isConnected = false;
            console.log('Azure Cosmos DB connection closed');
        } catch (error) {
            console.error('Error closing Azure Cosmos DB connection:', error);
        }
    }

    /**
     * Check if service is connected
     */
    isServiceConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get collection reference
     */
    private getCollection(collectionName: string): Collection<Document> {
        return this.db.collection(collectionName);
    }

    /**
     * Add metadata to document
     */
    private addMetadata(document: any, userId?: string): CosmosDocument {
        const now = new Date();
        return {
            ...document,
            ...(userId && { userId }),
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * Update metadata for existing document
     */
    private updateMetadata(updates: any): any {
        return {
            ...updates,
            updatedAt: new Date()
        };
    }

    /**
     * 1. Create Document
     */
    async createDocument(params: CreateDocumentParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = createDocumentSchema.parse(params);
            const { collection, document, userId } = validatedParams;

            // Get collection
            const coll = this.getCollection(collection);

            // Add metadata
            const documentWithMetadata = this.addMetadata(document, userId);

            // Insert document (remove _id if it exists since MongoDB will generate it)
            const { _id, ...documentToInsert } = documentWithMetadata;
            const result = await coll.insertOne(documentToInsert);

            return {
                success: true,
                data: {
                    _id: result.insertedId.toString(),
                    ...documentWithMetadata
                },
                insertedId: result.insertedId.toString()
            };

        } catch (error) {
            console.error('Error creating document:', error);
            return {
                success: false,
                error: `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 2. Get Document
     */
    async getDocument(params: GetDocumentParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = getDocumentSchema.parse(params);
            const { collection, id, userId } = validatedParams;

            // Get collection
            const coll = this.getCollection(collection);

            // Build filter
            const filter: Filter<Document> = { _id: new ObjectId(id) };
            if (userId) {
                filter.userId = userId;
            }

            // Find document
            const document = await coll.findOne(filter);

            if (!document) {
                return {
                    success: false,
                    error: `Document with ID "${id}" not found${userId ? ` for user "${userId}"` : ''}`
                };
            }

            return {
                success: true,
                data: {
                    ...document,
                    _id: document._id.toString()
                }
            };

        } catch (error) {
            console.error('Error getting document:', error);
            return {
                success: false,
                error: `Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 3. Update Document
     */
    async updateDocument(params: UpdateDocumentParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = updateDocumentSchema.parse(params);
            const { collection, id, updates, userId } = validatedParams;

            // Get collection
            const coll = this.getCollection(collection);

            // Build filter
            const filter: Filter<Document> = { _id: new ObjectId(id) };
            if (userId) {
                filter.userId = userId;
            }

            // Add update metadata
            const updatesWithMetadata = this.updateMetadata(updates);

            // Update document
            const result = await coll.updateOne(
                filter,
                { $set: updatesWithMetadata }
            );

            if (result.matchedCount === 0) {
                return {
                    success: false,
                    error: `Document with ID "${id}" not found${userId ? ` for user "${userId}"` : ''}`
                };
            }

            // Get updated document
            const updatedDocument = await coll.findOne(filter);

            return {
                success: true,
                data: updatedDocument ? {
                    ...updatedDocument,
                    _id: updatedDocument._id.toString()
                } : null,
                modifiedCount: result.modifiedCount
            };

        } catch (error) {
            console.error('Error updating document:', error);
            return {
                success: false,
                error: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 4. Delete Document
     */
    async deleteDocument(params: DeleteDocumentParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = deleteDocumentSchema.parse(params);
            const { collection, id, userId } = validatedParams;

            // Get collection
            const coll = this.getCollection(collection);

            // Build filter
            const filter: Filter<Document> = { _id: new ObjectId(id) };
            if (userId) {
                filter.userId = userId;
            }

            // Delete document
            const result = await coll.deleteOne(filter);

            if (result.deletedCount === 0) {
                return {
                    success: false,
                    error: `Document with ID "${id}" not found${userId ? ` for user "${userId}"` : ''}`
                };
            }

            return {
                success: true,
                data: true,
                deletedCount: result.deletedCount
            };

        } catch (error) {
            console.error('Error deleting document:', error);
            return {
                success: false,
                error: `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 5. Query Documents
     */
    async queryDocuments(params: QueryDocumentsParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = queryDocumentsSchema.parse(params);
            const { collection, filter = {}, options = {}, userId } = validatedParams;

            // Get collection
            const coll = this.getCollection(collection);

            // Build filter with user scope if provided
            const finalFilter: Filter<Document> = { ...filter };
            if (userId) {
                finalFilter.userId = userId;
            }

            // Execute query
            const cursor = coll.find(finalFilter, options);
            const documents = await cursor.toArray();

            // Convert ObjectIds to strings
            const convertedDocuments = documents.map(doc => ({
                ...doc,
                _id: doc._id.toString()
            }));

            return {
                success: true,
                data: convertedDocuments
            };

        } catch (error) {
            console.error('Error querying documents:', error);
            return {
                success: false,
                error: `Failed to query documents: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 6. Aggregate Data
     */
    async aggregateData(params: AggregateDataParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = aggregateDataSchema.parse(params);
            const { collection, pipeline, options = {}, userId } = validatedParams;

            // Get collection
            const coll = this.getCollection(collection);

            // Add user filter to pipeline if userId provided
            let finalPipeline = [...pipeline];
            if (userId) {
                finalPipeline.unshift({ $match: { userId } });
            }

            // Execute aggregation
            const cursor = coll.aggregate(finalPipeline, options);
            const results = await cursor.toArray();

            // Convert ObjectIds to strings
            const convertedResults = results.map(doc => {
                if (doc._id && typeof doc._id === 'object') {
                    return {
                        ...doc,
                        _id: doc._id.toString()
                    };
                }
                return doc;
            });

            return {
                success: true,
                data: convertedResults
            };

        } catch (error) {
            console.error('Error aggregating data:', error);
            return {
                success: false,
                error: `Failed to aggregate data: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 7. Get User Documents (user-scoped query)
     */
    async getUserDocuments(params: UserScopedQueryParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = userScopedQuerySchema.parse(params);
            const { userId, collection, filter = {}, options = {} } = validatedParams;

            return await this.queryDocuments({
                collection,
                filter: { ...filter, userId },
                options,
                userId
            });

        } catch (error) {
            console.error('Error getting user documents:', error);
            return {
                success: false,
                error: `Failed to get user documents: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 8. Create User Document (user-scoped create)
     */
    async createUserDocument(params: UserScopedCreateParams): Promise<CosmosServiceResult> {
        try {
            // Validate input
            const validatedParams = userScopedCreateSchema.parse(params);
            const { userId, collection, document } = validatedParams;

            return await this.createDocument({
                collection,
                document,
                userId
            });

        } catch (error) {
            console.error('Error creating user document:', error);
            return {
                success: false,
                error: `Failed to create user document: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 9. Update User Document (user-scoped update)
     */
    async updateUserDocument(userId: string, collection: string, documentId: string, updates: any): Promise<CosmosServiceResult> {
        return await this.updateDocument({
            collection,
            id: documentId,
            updates,
            userId
        });
    }

    /**
     * 10. Delete User Document (user-scoped delete)
     */
    async deleteUserDocument(userId: string, collection: string, documentId: string): Promise<CosmosServiceResult> {
        return await this.deleteDocument({
            collection,
            id: documentId,
            userId
        });
    }

    /**
     * Utility: Count Documents
     */
    async countDocuments(collection: string, filter: Filter<Document> = {}, userId?: string): Promise<CosmosServiceResult<number>> {
        try {
            const coll = this.getCollection(collection);

            const finalFilter = { ...filter };
            if (userId) {
                finalFilter.userId = userId;
            }

            const count = await coll.countDocuments(finalFilter);

            return {
                success: true,
                data: count
            };

        } catch (error) {
            console.error('Error counting documents:', error);
            return {
                success: false,
                error: `Failed to count documents: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Utility: Check if Document Exists
     */
    async existsDocument(collection: string, id: string, userId?: string): Promise<CosmosServiceResult<boolean>> {
        try {
            const coll = this.getCollection(collection);

            const filter: Filter<Document> = { _id: new ObjectId(id) };
            if (userId) {
                filter.userId = userId;
            }

            const count = await coll.countDocuments(filter, { limit: 1 });

            return {
                success: true,
                data: count > 0
            };

        } catch (error) {
            console.error('Error checking document existence:', error);
            return {
                success: false,
                error: `Failed to check document existence: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Utility: Get Collection Stats
     */
    async getCollectionStats(collection: string): Promise<CosmosServiceResult> {
        try {
            const coll = this.getCollection(collection);
            const stats = await this.db.command({ collStats: collection });

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('Error getting collection stats:', error);
            return {
                success: false,
                error: `Failed to get collection stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}