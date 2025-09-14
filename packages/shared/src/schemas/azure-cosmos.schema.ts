import { z } from 'zod';

// Base schemas
export const userIdSchema = z.string().min(1, 'User ID is required');

export const collectionNameSchema = z.string()
  .min(1, 'Collection name is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Collection name can only contain letters, numbers, underscores and hyphens');

export const documentIdSchema = z.string().min(1, 'Document ID is required');

export const documentSchema = z.record(z.string(), z.any());

export const filterSchema = z.record(z.string(), z.any()).optional();

export const pipelineSchema = z.array(z.record(z.string(), z.any()));

// Configuration Schema
export const azureCosmosConfigSchema = z.object({
  connectionString: z.string().min(1, 'MongoDB connection string is required'),
  databaseName: z.string().min(1, 'Database name is required'),
  testDatabaseName: z.string().optional()
});

// Create Document Schema
export const createDocumentSchema = z.object({
  collection: collectionNameSchema,
  document: documentSchema,
  userId: userIdSchema.optional()
});

// Get Document Schema
export const getDocumentSchema = z.object({
  collection: collectionNameSchema,
  id: documentIdSchema,
  userId: userIdSchema.optional()
});

// Update Document Schema
export const updateDocumentSchema = z.object({
  collection: collectionNameSchema,
  id: documentIdSchema,
  updates: documentSchema,
  userId: userIdSchema.optional()
});

// Delete Document Schema
export const deleteDocumentSchema = z.object({
  collection: collectionNameSchema,
  id: documentIdSchema,
  userId: userIdSchema.optional()
});

// Query Documents Schema
export const queryDocumentsSchema = z.object({
  collection: collectionNameSchema,
  filter: filterSchema.default({}),
  options: z.object({
    limit: z.number().positive().max(1000).optional(),
    skip: z.number().min(0).optional(),
    sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
    projection: z.record(z.string(), z.union([z.literal(0), z.literal(1)])).optional()
  }).optional(),
  userId: userIdSchema.optional()
});

// Aggregate Data Schema
export const aggregateDataSchema = z.object({
  collection: collectionNameSchema,
  pipeline: pipelineSchema,
  options: z.object({
    allowDiskUse: z.boolean().optional(),
    maxTimeMS: z.number().positive().optional()
  }).optional(),
  userId: userIdSchema.optional()
});

// User-scoped Query Schema
export const userScopedQuerySchema = z.object({
  userId: userIdSchema,
  collection: collectionNameSchema,
  filter: filterSchema.default({}),
  options: z.object({
    limit: z.number().positive().max(1000).optional(),
    skip: z.number().min(0).optional(),
    sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
    projection: z.record(z.string(), z.union([z.literal(0), z.literal(1)])).optional()
  }).optional()
});

// User-scoped Create Schema
export const userScopedCreateSchema = z.object({
  userId: userIdSchema,
  collection: collectionNameSchema,
  document: documentSchema
});

// Result Schema
export const cosmosServiceResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  insertedId: z.string().optional(),
  modifiedCount: z.number().optional(),
  deletedCount: z.number().optional()
});

// Export types derived from schemas
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type GetDocumentInput = z.infer<typeof getDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>;
export type QueryDocumentsInput = z.infer<typeof queryDocumentsSchema>;
export type AggregateDataInput = z.infer<typeof aggregateDataSchema>;
export type UserScopedQueryInput = z.infer<typeof userScopedQuerySchema>;
export type UserScopedCreateInput = z.infer<typeof userScopedCreateSchema>;
export type AzureCosmosConfig = z.infer<typeof azureCosmosConfigSchema>;
export type CosmosServiceResult = z.infer<typeof cosmosServiceResultSchema>;