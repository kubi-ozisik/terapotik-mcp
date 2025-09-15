import { AzureStorageService } from '../services/azure-storage-service';

// Global test configuration
declare global {
  var testAzureService: AzureStorageService;
  var testUserId: string;
}

beforeAll(async () => {
  // Initialize test Azure Storage service
  global.testAzureService = new AzureStorageService({
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'artifacts-test'
  });

  // Initialize the service (create container if needed)
  await global.testAzureService.initialize();

  // Set a consistent test user ID
  global.testUserId = 'test-user-123';
});

afterAll(async () => {
  // Clean up test data - DISABLED FOR TESTING
  // try {
  //   if (global.testAzureService) {
  //     await global.testAzureService.deleteArtifact({
  //       userId: global.testUserId,
  //       fileName: 'test-document.md',
  //       deleteAllVersions: true
  //     });
  //   }
  // } catch (error) {
  //   // Ignore cleanup errors
  //   console.warn('Cleanup warning:', error);
  // }
});