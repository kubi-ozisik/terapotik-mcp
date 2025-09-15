import { AzureCosmosService } from '../services/azure-cosmos-service';
import { AzureCosmosConfig } from '../types/azure-cosmos';

describe.only('AzureCosmosService', () => {
    let service: AzureCosmosService;
    const testUserId = 'test-user-123';
    const testCollection = 'test-collection';
    const testDocument = {
        name: 'Test Document',
        content: 'This is a test document',
        category: 'test'
    };

    beforeAll(async () => {
        const config: AzureCosmosConfig = {
            connectionString: process.env.AZURE_COSMOS_CONNECTION_STRING!,
            databaseName: 'test-database'
        };

        service = new AzureCosmosService(config);
        await service.initialize();
    });

    afterAll(async () => {
        // Clean up test data
        try {
            if (service.isServiceConnected()) {
                // Delete all test documents
                await service.queryDocuments({
                    collection: testCollection,
                    filter: { userId: testUserId }
                }).then(async (result) => {
                    if (result.success && result.data) {
                        for (const doc of result.data) {
                            await service.deleteDocument({
                                collection: testCollection,
                                id: doc._id,
                                userId: testUserId
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('Cleanup warning:', error);
        }
        await service.close();
    });

    describe('createDocument', () => {
        it('should create a new document successfully', async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?._id).toBeDefined();
            expect(result.data?.name).toBe(testDocument.name);
            expect(result.data?.userId).toBe(testUserId);
            expect(result.data?.createdAt).toBeDefined();
            expect(result.data?.updatedAt).toBeDefined();
            expect(result.insertedId).toBeDefined();
        });

        it('should create a document without userId', async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'No User Document' }
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?._id).toBeDefined();
            expect(result.data?.name).toBe('No User Document');
            expect(result.data?.userId).toBeUndefined();
        });

        it('should handle invalid input', async () => {
            const result = await service.createDocument({
                collection: '', // Invalid empty collection
                document: testDocument
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Collection name is required');
        });
    });

    describe('getDocument', () => {
        let createdDocumentId: string;

        beforeEach(async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });
            createdDocumentId = result.data?._id || '';
        });

        it('should get an existing document', async () => {
            const result = await service.getDocument({
                collection: testCollection,
                id: createdDocumentId,
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?._id).toBe(createdDocumentId);
            expect(result.data?.name).toBe(testDocument.name);
        });

        it('should get document without userId filter', async () => {
            const result = await service.getDocument({
                collection: testCollection,
                id: createdDocumentId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?._id).toBe(createdDocumentId);
        });

        it('should handle non-existent document', async () => {
            const result = await service.getDocument({
                collection: testCollection,
                id: '507f1f77bcf86cd799439011', // Non-existent ObjectId
                userId: testUserId
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should handle invalid ObjectId', async () => {
            const result = await service.getDocument({
                collection: testCollection,
                id: 'invalid-id',
                userId: testUserId
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to get document');
        });
    });

    describe('updateDocument', () => {
        let createdDocumentId: string;

        beforeEach(async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });
            createdDocumentId = result.data?._id || '';
        });

        it('should update an existing document', async () => {
            const updates = {
                name: 'Updated Document',
                content: 'Updated content'
            };

            const result = await service.updateDocument({
                collection: testCollection,
                id: createdDocumentId,
                updates,
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.name).toBe(updates.name);
            expect(result.data?.content).toBe(updates.content);
            expect(result.data?.updatedAt).toBeDefined();
            expect(result.modifiedCount).toBe(1);
        });

        it('should handle non-existent document', async () => {
            const result = await service.updateDocument({
                collection: testCollection,
                id: '507f1f77bcf86cd799439011',
                updates: { name: 'Updated' },
                userId: testUserId
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe.only('deleteDocument', () => {
        let createdDocumentId: string;

        beforeEach(async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });
            createdDocumentId = result.data?._id || '';
        });

        it('should delete an existing document', async () => {
            const result = await service.deleteDocument({
                collection: testCollection,
                id: createdDocumentId,
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
            expect(result.deletedCount).toBe(1);

            // Verify document is deleted
            const getResult = await service.getDocument({
                collection: testCollection,
                id: createdDocumentId,
                userId: testUserId
            });
            expect(getResult.success).toBe(false);
        });

        it('should handle non-existent document', async () => {
            const result = await service.deleteDocument({
                collection: testCollection,
                id: '507f1f77bcf86cd799439011',
                userId: testUserId
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('queryDocuments', () => {
        beforeEach(async () => {
            // Create multiple test documents
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Document 1', category: 'type1' },
                userId: testUserId
            });
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Document 2', category: 'type2' },
                userId: testUserId
            });
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Document 3', category: 'type1' },
                userId: testUserId
            });
        });

        it('should query all documents for user', async () => {
            const result = await service.queryDocuments({
                collection: testCollection,
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.length).toBeGreaterThanOrEqual(3);
            expect(result.data!.every((doc: any) => doc.userId === testUserId)).toBe(true);
        });

        it('should query documents with filter', async () => {
            const result = await service.queryDocuments({
                collection: testCollection,
                filter: { category: 'type1' },
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.length).toBeGreaterThanOrEqual(2);
            expect(result.data!.every((doc: any) => doc.category === 'type1')).toBe(true);
        });

        it('should query with options', async () => {
            const result = await service.queryDocuments({
                collection: testCollection,
                options: { limit: 2 },
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.length).toBeLessThanOrEqual(2);
        });
    });

    describe('aggregateData', () => {
        beforeEach(async () => {
            // Create test documents for aggregation
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Doc 1', value: 10, category: 'A' },
                userId: testUserId
            });
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Doc 2', value: 20, category: 'B' },
                userId: testUserId
            });
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Doc 3', value: 30, category: 'A' },
                userId: testUserId
            });
        });

        it('should aggregate data by category', async () => {
            const pipeline = [
                { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
                { $sort: { _id: 1 } }
            ];

            const result = await service.aggregateData({
                collection: testCollection,
                pipeline,
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle empty pipeline', async () => {
            const result = await service.aggregateData({
                collection: testCollection,
                pipeline: [],
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });
    });

    describe('getUserDocuments', () => {
        beforeEach(async () => {
            await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'User Doc 1' },
                userId: testUserId
            });
        });

        it('should get user documents', async () => {
            const result = await service.getUserDocuments({
                userId: testUserId,
                collection: testCollection
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.every((doc: any) => doc.userId === testUserId)).toBe(true);
        });
    });

    describe('createUserDocument', () => {
        it('should create user document', async () => {
            const result = await service.createUserDocument({
                userId: testUserId,
                collection: testCollection,
                document: { ...testDocument, name: 'User Created Doc' }
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.userId).toBe(testUserId);
        });
    });

    describe('updateUserDocument', () => {
        let createdDocumentId: string;

        beforeEach(async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });
            createdDocumentId = result.data?._id || '';
        });

        it('should update user document', async () => {
            const result = await service.updateUserDocument(
                testUserId,
                testCollection,
                createdDocumentId,
                { name: 'Updated User Doc' }
            );

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.name).toBe('Updated User Doc');
        });
    });

    describe('deleteUserDocument', () => {
        let createdDocumentId: string;

        beforeEach(async () => {
            const result = await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });
            createdDocumentId = result.data?._id || '';
        });

        it('should delete user document', async () => {
            const result = await service.deleteUserDocument(
                testUserId,
                testCollection,
                createdDocumentId
            );

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
        });
    });

    describe('utility methods', () => {
        beforeEach(async () => {
            await service.createDocument({
                collection: testCollection,
                document: testDocument,
                userId: testUserId
            });
        });

        it('should count documents', async () => {
            const result = await service.countDocuments(testCollection, {}, testUserId);

            expect(result.success).toBe(true);
            expect(result.data).toBeGreaterThan(0);
        });

        it('should check if document exists', async () => {
            // First create a document to get its ID
            const createResult = await service.createDocument({
                collection: testCollection,
                document: { ...testDocument, name: 'Exists Test' },
                userId: testUserId
            });

            const result = await service.existsDocument(
                testCollection,
                createResult.data!._id,
                testUserId
            );

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
        });

        it('should get collection stats', async () => {
            const result = await service.getCollectionStats(testCollection);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });
    });
});
