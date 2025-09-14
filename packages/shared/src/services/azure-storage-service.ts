import { 
    BlobServiceClient, 
    ContainerClient, 
    BlobClient,
    PublicAccessType,
    BlobHTTPHeaders,
    BlobUploadCommonResponse,
    BlobDeleteResponse
  } from '@azure/storage-blob';

  import { 
    AzureStorageConfig,
    SaveArtifactParams,
    ListArtifactsParams,
    UpdateArtifactParams,
    DeleteArtifactParams,
    SetAccessLevelParams,
    ArtifactInfo,
    AzureStorageServiceResult,
    ArtifactMetadata
  } from '../types/azure-storage';
  import {
    saveArtifactSchema,
    listArtifactsSchema,
    updateArtifactSchema,
    deleteArtifactSchema,
    setAccessLevelSchema,
    azureStorageConfigSchema
  } from '../schemas/azure-storage.schema';
  
  export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private containerClient: ContainerClient;
    private config: AzureStorageConfig;
  
    constructor(config: AzureStorageConfig) {
      // Validate configuration
      const validatedConfig = azureStorageConfigSchema.parse(config);
      this.config = validatedConfig;
  
      // Initialize Azure Blob Service Client
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        this.config.connectionString
      );
      
      // Get container client
      this.containerClient = this.blobServiceClient.getContainerClient(
        this.config.containerName
      );
    }
  
    /**
     * Initialize the service - create container if it doesn't exist
     */
    async initialize(): Promise<void> {
      try {
        // Create container if it doesn't exist
        await this.containerClient.createIfNotExists({
          access: 'blob' // Allow public access to individual blobs when set to public
        });
        
        console.log(`Azure Storage container "${this.config.containerName}" initialized`);
      } catch (error) {
        console.error('Failed to initialize Azure Storage:', error);
        throw new Error(`Azure Storage initialization failed: ${error}`);
      }
    }
  
    /**
     * Generate blob path for user-specific storage
     */
    private generateBlobPath(userId: string, fileName: string, isArchived = false): string {
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'txt';
      const baseName = fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
      
      const timestampedFileName = `${timestamp}_${baseName}.${fileExtension}`;
      const folder = isArchived ? 'archive' : 'active';
      
      return `users/${userId}/${folder}/${timestampedFileName}`;
    }
  
    /**
     * Generate public blob path
     */
    private generatePublicBlobPath(userId: string, fileName: string): string {
      return `public/${userId}/${fileName}`;
    }
  
    /**
     * Extract original file name from blob path
     */
    private extractOriginalFileName(blobPath: string): string {
      const fileName = blobPath.split('/').pop() || '';
      // Remove timestamp prefix (YYYYMMDD_)
      return fileName.replace(/^\d{8}_/, '');
    }
  
    /**
     * Get content type from file extension
     */
    private getContentType(fileName: string): string {
      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'md': 'text/markdown',
        'txt': 'text/plain',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml'
      };
      return mimeTypes[extension || ''] || 'application/octet-stream';
    }
  
    /**
     * 1. Save (upload) artifact
     */
    async saveArtifact(params: SaveArtifactParams): Promise<AzureStorageServiceResult<ArtifactInfo>> {
      try {
        // Validate input
        const validatedParams = saveArtifactSchema.parse(params);
        const { userId, fileName, content, contentType, isPublic = false, tags } = validatedParams;
  
        // Generate blob path
        const blobPath = isPublic 
          ? this.generatePublicBlobPath(userId, fileName)
          : this.generateBlobPath(userId, fileName);
  
        // Get blob client
        const blobClient = this.containerClient.getBlobClient(blobPath);
        const blockBlobClient = blobClient.getBlockBlobClient();
  
        // Determine content type
        const finalContentType = contentType || this.getContentType(fileName);
  
        // Set blob HTTP headers
        const blobHTTPHeaders: BlobHTTPHeaders = {
          blobContentType: finalContentType,
          blobCacheControl: isPublic ? 'public, max-age=3600' : 'private'
        };
  
        // Upload blob
        const uploadResponse: BlobUploadCommonResponse = await blockBlobClient.upload(
          content,
          typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length,
          {
            blobHTTPHeaders,
            metadata: {
              userId,
              originalFileName: fileName,
              isPublic: isPublic.toString(),
              uploadedAt: new Date().toISOString(),
              ...tags
            }
          }
        );
  
        // Set public access level if needed
        if (isPublic) {
          await blobClient.setAccessTier('Hot'); // Optimize for frequent access
        }
  
        // Get blob properties for response
        const properties = await blobClient.getProperties();
        
        const artifactInfo: ArtifactInfo = {
          fileName: blobPath.split('/').pop() || fileName,
          originalName: fileName,
          size: properties.contentLength || 0,
          lastModified: properties.lastModified || new Date(),
          isPublic,
          publicUrl: isPublic ? blobClient.url : undefined,
          contentType: finalContentType,
          version: uploadResponse.versionId,
          isArchived: blobPath.includes('/archive/'),
          tags
        };
  
        const metadata: ArtifactMetadata = {
          userId,
          fileName: blobPath.split('/').pop() || fileName,
          originalName: fileName,
          fileExtension: fileName.split('.').pop() || '',
          contentType: finalContentType,
          size: properties.contentLength || 0,
          lastModified: properties.lastModified || new Date(),
          isPublic,
          version: uploadResponse.versionId,
          tags
        };
  
        return {
          success: true,
          data: artifactInfo,
          metadata
        };
  
      } catch (error) {
        console.error('Error saving artifact:', error);
        return {
          success: false,
          error: `Failed to save artifact: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  
    /**
     * 2. List artifacts
     */
    async listArtifacts(params: ListArtifactsParams): Promise<AzureStorageServiceResult<ArtifactInfo[]>> {
      try {
        // Validate input
        const validatedParams = listArtifactsSchema.parse(params);
        const { userId, prefix = '', includeArchived = false, maxResults = 100 } = validatedParams;
  
        // Build search prefix
        const searchPrefixes = [`users/${userId}/active/`];
        if (includeArchived) {
          searchPrefixes.push(`users/${userId}/archive/`);
        }
  
        const artifacts: ArtifactInfo[] = [];
  
        for (const searchPrefix of searchPrefixes) {
          // List all blobs in the user's folder first
          const listOptions = {
            prefix: searchPrefix,
            includeMetadata: true
          };

          for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
            if (artifacts.length >= maxResults) break;

            // Extract original filename and check if it matches the prefix
            const originalFileName = this.extractOriginalFileName(blob.name);
            
            // Apply prefix filter to original filename, not blob path
            if (prefix && !originalFileName.startsWith(prefix)) {
              continue;
            }

            const blobClient = this.containerClient.getBlobClient(blob.name);
            
            const artifactInfo: ArtifactInfo = {
              fileName: blob.name.split('/').pop() || '',
              originalName: originalFileName,
              size: blob.properties.contentLength || 0,
              lastModified: blob.properties.lastModified || new Date(),
              isPublic: blob.metadata?.isPublic === 'true',
              publicUrl: blob.metadata?.isPublic === 'true' ? blobClient.url : undefined,
              contentType: blob.properties.contentType || 'application/octet-stream',
              version: blob.versionId,
              isArchived: blob.name.includes('/archive/'),
              tags: { ...blob.metadata }
            };

            artifacts.push(artifactInfo);
          }
        }
  
        // Sort by last modified (newest first)
        artifacts.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  
        return {
          success: true,
          data: artifacts
        };
  
      } catch (error) {
        console.error('Error listing artifacts:', error);
        return {
          success: false,
          error: `Failed to list artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  
    /**
     * 3. Update artifact (with archiving)
     */
    async updateArtifact(params: UpdateArtifactParams): Promise<AzureStorageServiceResult<ArtifactInfo>> {
      try {
        // Validate input
        const validatedParams = updateArtifactSchema.parse(params);
        const { userId, fileName, content, contentType, archiveExisting = true } = validatedParams;
  
        // First, find the existing file
        const activePrefix = `users/${userId}/active/`;
        let existingBlobName: string | null = null;
        
        for await (const blob of this.containerClient.listBlobsFlat({ prefix: activePrefix })) {
          if (this.extractOriginalFileName(blob.name) === fileName) {
            existingBlobName = blob.name;
            break;
          }
        }
  
        // Archive existing file if found and requested
        if (existingBlobName && archiveExisting) {
          const existingBlobClient = this.containerClient.getBlobClient(existingBlobName);
          const archivePath = existingBlobName.replace('/active/', '/archive/');
          const archiveBlobClient = this.containerClient.getBlobClient(archivePath);
          
          // Copy to archive location
          await archiveBlobClient.syncCopyFromURL(existingBlobClient.url);
          
          // Delete original
          await existingBlobClient.delete();
        }
  
        // Now save the new version (reuse saveArtifact)
        const saveParams: SaveArtifactParams = {
          userId,
          fileName,
          content,
          contentType,
          isPublic: false // Updates are private by default
        };
  
        return await this.saveArtifact(saveParams);
  
      } catch (error) {
        console.error('Error updating artifact:', error);
        return {
          success: false,
          error: `Failed to update artifact: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  
    /**
     * 4. Delete artifact
     */
    async deleteArtifact(params: DeleteArtifactParams): Promise<AzureStorageServiceResult<boolean>> {
      try {
        // Validate input
        const validatedParams = deleteArtifactSchema.parse(params);
        const { userId, fileName, deleteAllVersions = false } = validatedParams;
  
        const searchPrefixes = [`users/${userId}/active/`, `users/${userId}/archive/`, `public/${userId}/`];
        let deletedCount = 0;
  
        for (const searchPrefix of searchPrefixes) {
          for await (const blob of this.containerClient.listBlobsFlat({ prefix: searchPrefix })) {
            if (this.extractOriginalFileName(blob.name) === fileName) {
              const blobClient = this.containerClient.getBlobClient(blob.name);
              
              if (deleteAllVersions) {
                // Delete all versions
                await blobClient.delete({ deleteSnapshots: 'include' });
              } else {
                // Delete only current version
                await blobClient.delete();
              }
              
              deletedCount++;
              
              if (!deleteAllVersions) break; // Only delete first match if not deleting all versions
            }
          }
        }
  
        if (deletedCount === 0) {
          return {
            success: false,
            error: `Artifact "${fileName}" not found for user "${userId}"`
          };
        }
  
        return {
          success: true,
          data: true
        };
  
      } catch (error) {
        console.error('Error deleting artifact:', error);
        return {
          success: false,
          error: `Failed to delete artifact: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  
    /**
     * 5. Set access level (public/private)
     */
    async setAccessLevel(params: SetAccessLevelParams): Promise<AzureStorageServiceResult<ArtifactInfo>> {
      try {
        // Validate input
        const validatedParams = setAccessLevelSchema.parse(params);
        const { userId, fileName, isPublic } = validatedParams;
  
        // Find the existing file
        const searchPrefixes = [`users/${userId}/active/`, `users/${userId}/archive/`, `public/${userId}/`];
        let existingBlobName: string | null = null;
        let existingBlobClient: BlobClient | null = null;
  
        for (const searchPrefix of searchPrefixes) {
          for await (const blob of this.containerClient.listBlobsFlat({ prefix: searchPrefix })) {
            if (this.extractOriginalFileName(blob.name) === fileName) {
              existingBlobName = blob.name;
              existingBlobClient = this.containerClient.getBlobClient(blob.name);
              break;
            }
          }
          if (existingBlobClient) break;
        }
  
        if (!existingBlobClient || !existingBlobName) {
          return {
            success: false,
            error: `Artifact "${fileName}" not found for user "${userId}"`
          };
        }
  
        if (isPublic) {
          // Move to public folder
          const publicPath = this.generatePublicBlobPath(userId, fileName);
          const publicBlobClient = this.containerClient.getBlobClient(publicPath);
          
          // Copy to public location
          await publicBlobClient.syncCopyFromURL(existingBlobClient.url);
          
          // Update metadata
          const existingProperties = await existingBlobClient.getProperties();
          await publicBlobClient.setMetadata({
            ...(existingProperties.metadata || {}),
            isPublic: 'true'
          });
          
          // Delete from original location
          await existingBlobClient.delete();
          
          // Get properties for response
          const properties = await publicBlobClient.getProperties();
          
          const artifactInfo: ArtifactInfo = {
            fileName: publicPath.split('/').pop() || fileName,
            originalName: fileName,
            size: properties.contentLength || 0,
            lastModified: properties.lastModified || new Date(),
            isPublic: true,
            publicUrl: publicBlobClient.url,
            contentType: properties.contentType || this.getContentType(fileName),
            version: properties.versionId,
            isArchived: false,
            tags: properties.metadata
          };
  
          return {
            success: true,
            data: artifactInfo
          };
  
        } else {
          // Move back to private folder (if currently public)
          if (existingBlobName.startsWith('public/')) {
            const privatePath = this.generateBlobPath(userId, fileName);
            const privateBlobClient = this.containerClient.getBlobClient(privatePath);
            
            // Copy to private location
            await privateBlobClient.syncCopyFromURL(existingBlobClient.url);
            
            // Update metadata
            const existingProperties = await existingBlobClient.getProperties();
            await privateBlobClient.setMetadata({
              ...(existingProperties.metadata || {}),
              isPublic: 'false'
            });
            
            // Delete from public location
            await existingBlobClient.delete();
            
            // Get properties for response
            const properties = await privateBlobClient.getProperties();
            
            const artifactInfo: ArtifactInfo = {
              fileName: privatePath.split('/').pop() || fileName,
              originalName: fileName,
              size: properties.contentLength || 0,
              lastModified: properties.lastModified || new Date(),
              isPublic: false,
              publicUrl: undefined,
              contentType: properties.contentType || this.getContentType(fileName),
              version: properties.versionId,
              isArchived: privatePath.includes('/archive/'),
              tags: properties.metadata
            };
  
            return {
              success: true,
              data: artifactInfo
            };
          } else {
            // Already private, just update metadata
            const existingProperties = await existingBlobClient.getProperties();
            await existingBlobClient.setMetadata({
              ...(existingProperties.metadata || {}),
              isPublic: 'false'
            });
  
            const properties = await existingBlobClient.getProperties();
            
            const artifactInfo: ArtifactInfo = {
              fileName: existingBlobName.split('/').pop() || fileName,
              originalName: fileName,
              size: properties.contentLength || 0,
              lastModified: properties.lastModified || new Date(),
              isPublic: false,
              publicUrl: undefined,
              contentType: properties.contentType || this.getContentType(fileName),
              version: properties.versionId,
              isArchived: existingBlobName.includes('/archive/'),
              tags: properties.metadata
            };
  
            return {
              success: true,
              data: artifactInfo
            };
          }
        }
  
      } catch (error) {
        console.error('Error setting access level:', error);
        return {
          success: false,
          error: `Failed to set access level: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  
    /**
     * Get artifact content
     */
    async getArtifactContent(userId: string, fileName: string): Promise<AzureStorageServiceResult<string>> {
      try {
        // Search in both active and archive folders
        const searchPrefixes = [`users/${userId}/active/`, `users/${userId}/archive/`, `public/${userId}/`];
        
        for (const searchPrefix of searchPrefixes) {
          for await (const blob of this.containerClient.listBlobsFlat({ prefix: searchPrefix })) {
            if (this.extractOriginalFileName(blob.name) === fileName || blob.name.endsWith(fileName)) {
              const blobClient = this.containerClient.getBlobClient(blob.name);
              const downloadResponse = await blobClient.download();
              
              if (downloadResponse.readableStreamBody) {
                const chunks: Buffer[] = [];
                for await (const chunk of downloadResponse.readableStreamBody) {
                  chunks.push(Buffer.from(chunk));
                }
                const content = Buffer.concat(chunks).toString('utf8');
                
                return {
                  success: true,
                  data: content
                };
              }
            }
          }
        }
  
        return {
          success: false,
          error: `Artifact "${fileName}" not found for user "${userId}"`
        };
  
      } catch (error) {
        console.error('Error getting artifact content:', error);
        return {
          success: false,
          error: `Failed to get artifact content: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  }