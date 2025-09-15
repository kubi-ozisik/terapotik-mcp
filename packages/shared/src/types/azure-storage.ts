export interface AzureStorageConfig {
    connectionString: string;
    containerName: string;
    testContainerName?: string;
  }
  
  export interface ArtifactMetadata {
    userId: string;
    fileName: string;
    originalName: string;
    fileExtension: string;
    contentType: string;
    size: number;
    lastModified: Date;
    isPublic: boolean;
    version?: string;
    tags?: Record<string, string>;
  }
  
  export interface SaveArtifactParams {
    userId: string;
    fileName: string;
    content: string | Buffer;
    contentType?: string;
    isPublic?: boolean;
    tags?: Record<string, string>;
  }
  
  export interface ListArtifactsParams {
    userId: string;
    prefix?: string;
    includeArchived?: boolean;
    maxResults?: number;
  }
  
  export interface UpdateArtifactParams {
    userId: string;
    fileName: string;
    content: string | Buffer;
    contentType?: string;
    archiveExisting?: boolean;
  }
  
  export interface DeleteArtifactParams {
    userId: string;
    fileName: string;
    deleteAllVersions?: boolean;
  }
  
  export interface SetAccessLevelParams {
    userId: string;
    fileName: string;
    isPublic: boolean;
  }
  
  export interface ArtifactInfo {
    fileName: string;
    originalName: string;
    size: number;
    lastModified: Date;
    isPublic: boolean;
    publicUrl?: string;
    contentType: string;
    version?: string;
    isArchived: boolean;
    tags?: Record<string, string>;
  }
  
  export interface AzureStorageServiceResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: ArtifactMetadata;
  }