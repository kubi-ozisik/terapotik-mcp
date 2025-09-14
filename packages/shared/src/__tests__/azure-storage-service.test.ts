import { AzureStorageService } from '../services/azure-storage-service';
import { AzureStorageConfig } from '../types/azure-storage';


describe('AzureStorageService', () => {
    let service: AzureStorageService;
    const testUserId = 'test-user-123';
    const testFileName = 'test-document.md';
    const testContent = '# Test Document\n\nThis is a test markdown document.';


    beforeAll(async () => {
        const config: AzureStorageConfig = {
            connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
            containerName: 'artifacts-test'
        };
        console.log(process.env.AZURE_STORAGE_CONNECTION_STRING);

        service = new AzureStorageService(config);
        await service.initialize();
    });

    afterEach(async () => {
        // // Clean up after each test
        // try {
        //   await service.deleteArtifact({
        //     userId: testUserId,
        //     fileName: testFileName,
        //     deleteAllVersions: true
        //   });
        // } catch (error) {
        //   // Ignore cleanup errors
        // }
    });

    afterAll(async () => {
        // await service.deleteArtifact({
        //     userId: 'test-user-123',
        //     fileName: 'test-document.md',
        //     deleteAllVersions: true
        // });
    });

    describe('saveArtifact', () => {
        it('should save a new artifact successfully', async () => {
            console.log('Starting saveArtifact test...');

            const result = await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: testContent,
                contentType: 'text/markdown'
            });

            console.log('Save result:', JSON.stringify(result, null, 2));

            if (!result.success) {
                // console.error('Save failed:', result.error);
                throw new Error(`Save failed: ${result.error}`);
            }

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.originalName).toBe(testFileName);
            expect(result.data?.contentType).toBe('text/markdown');
            expect(result.data?.isPublic).toBe(false);
            expect(result.metadata?.userId).toBe(testUserId);

            // Wait a moment for the upload to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Now let's verify the file was actually uploaded by listing artifacts
            console.log('Listing artifacts to verify upload...');
            const listResult = await service.listArtifacts({
                userId: testUserId,
                includeArchived: true
            });

            console.log('List result:', JSON.stringify(listResult, null, 2));

            if (!listResult.success) {
                // console.error('List failed:', listResult.error);
                throw new Error(`List failed: ${listResult.error}`);
            }

            expect(listResult.success).toBe(true);
            expect(listResult.data).toBeDefined();
            expect(listResult.data?.length).toBeGreaterThan(0);
        });

        it('should save a public artifact with URL', async () => {
            const result = await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: testContent,
                isPublic: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.isPublic).toBe(true);
            expect(result.data?.publicUrl).toBeDefined();
            console.log(result.data?.publicUrl);
            expect(result.data?.publicUrl).toContain('https://');
        });

        it('should handle invalid input', async () => {
            const result = await service.saveArtifact({
                userId: '', // Invalid empty userId
                fileName: testFileName,
                content: testContent
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('User ID is required');
        });

        it('should save artifact with tags', async () => {
            const tags = { category: 'document', version: '1.0' };
            const result = await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: testContent,
                tags
            });

            expect(result.success).toBe(true);
            expect(result.data?.tags).toEqual(expect.objectContaining(tags));
        });
    });

    describe('listArtifacts', () => {
        beforeEach(async () => {
            // Create test artifacts
            await service.saveArtifact({
                userId: testUserId,
                fileName: 'doc1.md',
                content: '# Document 1'
            });

            await service.saveArtifact({
                userId: testUserId,
                fileName: 'doc2.json',
                content: '{"test": true}'
            });
        });

        afterEach(async () => {
            // Clean up test artifacts
            //   await service.deleteArtifact({
            //     userId: testUserId,
            //     fileName: 'doc1.md',
            //     deleteAllVersions: true
            //   });
            //   await service.deleteArtifact({
            //     userId: testUserId,
            //     fileName: 'doc2.json',
            //     deleteAllVersions: true
            //   });
        });

        it('should list user artifacts', async () => {
            const result = await service.listArtifacts({
                userId: testUserId
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.length).toBeGreaterThanOrEqual(2);

            const fileNames = result.data!.map(artifact => artifact.originalName);
            expect(fileNames).toContain('doc1.md');
            expect(fileNames).toContain('doc2.json');
        });

        it('should filter by prefix', async () => {
            const result = await service.listArtifacts({
                userId: testUserId,
                prefix: 'doc1'
            });

            expect(result.success).toBe(true);
            expect(result.data!.length).toBe(1);
            expect(result.data![0].originalName).toBe('doc1.md');
        });

        it('should limit results', async () => {
            const result = await service.listArtifacts({
                userId: testUserId,
                maxResults: 1
            });

            expect(result.success).toBe(true);
            expect(result.data!.length).toBe(1);
        });

        it('should handle non-existent user', async () => {
            const result = await service.listArtifacts({
                userId: 'non-existent-user'
            });

            expect(result.success).toBe(true);
            expect(result.data!.length).toBe(0);
        });
    });
    describe('updateArtifact', () => {
        beforeEach(async () => {
            // Create initial artifact
            await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: 'Original content'
            });
        });

        it('should update existing artifact and archive old version', async () => {
            const newContent = 'Updated content';

            const result = await service.updateArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: newContent,
                archiveExisting: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.originalName).toBe(testFileName);

            // Check that we can list archived versions
            const listResult = await service.listArtifacts({
                userId: testUserId,
                includeArchived: true
            });

            expect(listResult.success).toBe(true);
            const archivedFiles = listResult.data!.filter(f => f.isArchived);
            expect(archivedFiles.length).toBeGreaterThan(0);
        });

        it('should handle updating non-existent file', async () => {
            const result = await service.updateArtifact({
                userId: testUserId,
                fileName: 'update-test-file.md',
                content: 'New content'
            });

            // Should still succeed by creating new file
            expect(result.success).toBe(true);
            expect(result.data?.originalName).toBe('update-test-file.md');
        });
    });

    describe('deleteArtifact', () => {
        beforeEach(async () => {
            await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: testContent
            });
        });

        it('should delete existing artifact', async () => {
            const result = await service.deleteArtifact({
                userId: testUserId,
                fileName: testFileName
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);

            // Verify deletion
            const listResult = await service.listArtifacts({
                userId: testUserId
            });
            const fileNames = listResult.data!.map(f => f.originalName);
            expect(fileNames).not.toContain(testFileName);
        });

        it('should handle deleting non-existent file', async () => {
            const result = await service.deleteArtifact({
                userId: testUserId,
                fileName: 'non-existent.md'
            });

            console.log('Delete non-existent result:', JSON.stringify(result, null, 2));
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('setAccessLevel', () => {
        beforeEach(async () => {
            await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: testContent,
                isPublic: false
            });
        });

        it('should make private file public', async () => {
            const result = await service.setAccessLevel({
                userId: testUserId,
                fileName: testFileName,
                isPublic: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.isPublic).toBe(true);
            expect(result.data?.publicUrl).toBeDefined();
            expect(result.data?.publicUrl).toContain('https://');
        });

        it('should make public file private', async () => {
            // First make it public
            await service.setAccessLevel({
                userId: testUserId,
                fileName: testFileName,
                isPublic: true
            });

            // Then make it private
            const result = await service.setAccessLevel({
                userId: testUserId,
                fileName: testFileName,
                isPublic: false
            });

            expect(result.success).toBe(true);
            expect(result.data?.isPublic).toBe(false);
            expect(result.data?.publicUrl).toBeUndefined();
        });

        it('should handle non-existent file', async () => {
            const result = await service.setAccessLevel({
                userId: testUserId,
                fileName: 'really-non-existent-file.md',
                isPublic: true
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('getArtifactContent', () => {
        beforeEach(async () => {
            await service.saveArtifact({
                userId: testUserId,
                fileName: testFileName,
                content: testContent
            });
        });

        it('should retrieve artifact content', async () => {
            const result = await service.getArtifactContent(testUserId, testFileName);

            expect(result.success).toBe(true);
            expect(result.data).toBe(testContent);
        });

        it('should handle non-existent file', async () => {
            const result = await service.getArtifactContent(testUserId, 'really-non-existent-file.md');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });
})