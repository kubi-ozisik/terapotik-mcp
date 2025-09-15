import { z } from 'zod';

// Base schemas
export const userIdSchema = z.string().min(1, 'User ID is required');

export const fileNameSchema = z.string()
  .min(1, 'File name is required')
  .regex(/^[a-zA-Z0-9._-]+$/, 'File name can only contain letters, numbers, dots, hyphens and underscores');

export const contentSchema = z.union([
  z.string(),
  z.instanceof(Buffer)
]);

export const contentTypeSchema = z.string().optional();

export const tagsSchema = z.record(z.string(), z.string()).optional();

// Save Artifact Schema
export const saveArtifactSchema = z.object({
  userId: userIdSchema,
  fileName: fileNameSchema,
  content: contentSchema,
  contentType: contentTypeSchema,
  isPublic: z.boolean().optional().default(false),
  tags: tagsSchema
});

// List Artifacts Schema
export const listArtifactsSchema = z.object({
  userId: userIdSchema,
  prefix: z.string().optional(),
  includeArchived: z.boolean().optional().default(false),
  maxResults: z.number().positive().max(1000).optional().default(100)
});

// Update Artifact Schema
export const updateArtifactSchema = z.object({
  userId: userIdSchema,
  fileName: fileNameSchema,
  content: contentSchema,
  contentType: contentTypeSchema,
  archiveExisting: z.boolean().optional().default(true)
});

// Delete Artifact Schema
export const deleteArtifactSchema = z.object({
  userId: userIdSchema,
  fileName: fileNameSchema,
  deleteAllVersions: z.boolean().optional().default(false)
});

// Set Access Level Schema
export const setAccessLevelSchema = z.object({
  userId: userIdSchema,
  fileName: fileNameSchema,
  isPublic: z.boolean()
});

// Configuration Schema
export const azureStorageConfigSchema = z.object({
  connectionString: z.string().min(1, 'Azure Storage connection string is required'),
  containerName: z.string().min(1, 'Container name is required'),
  testContainerName: z.string().optional()
});

// Artifact Info Schema (for responses)
export const artifactInfoSchema = z.object({
  fileName: z.string(),
  originalName: z.string(),
  size: z.number(),
  lastModified: z.date(),
  isPublic: z.boolean(),
  publicUrl: z.string().optional(),
  contentType: z.string(),
  version: z.string().optional(),
  isArchived: z.boolean(),
  tags: tagsSchema
});

// Result Schema
export const azureStorageResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.object({
    userId: z.string(),
    fileName: z.string(),
    originalName: z.string(),
    fileExtension: z.string(),
    contentType: z.string(),
    size: z.number(),
    lastModified: z.date(),
    isPublic: z.boolean(),
    version: z.string().optional(),
    tags: tagsSchema
  }).optional()
});

// Export types derived from schemas
export type SaveArtifactInput = z.infer<typeof saveArtifactSchema>;
export type ListArtifactsInput = z.infer<typeof listArtifactsSchema>;
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;
export type DeleteArtifactInput = z.infer<typeof deleteArtifactSchema>;
export type SetAccessLevelInput = z.infer<typeof setAccessLevelSchema>;
export type AzureStorageConfig = z.infer<typeof azureStorageConfigSchema>;
export type ArtifactInfo = z.infer<typeof artifactInfoSchema>;
export type AzureStorageResult = z.infer<typeof azureStorageResultSchema>;