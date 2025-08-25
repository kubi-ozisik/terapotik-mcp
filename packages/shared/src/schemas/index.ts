import { z } from 'zod';

// User schemas 
export const CreateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  emailVerified: z.date().optional(),
  image: z.string().optional(),
  authId: z.string().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

// ServiceToken schemas
export const CreateServiceTokenSchema = z.object({
  userId: z.string(),
  service: z.enum(['google', 'atlassian']),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  scope: z.string().optional(),
});

export const UpdateServiceTokenSchema = CreateServiceTokenSchema.partial().omit({ userId: true, service: true });

// API Response schema 
export const ApiResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type CreateServiceToken = z.infer<typeof CreateServiceTokenSchema>;
export type UpdateServiceToken = z.infer<typeof UpdateServiceTokenSchema>;
export type ApiResponse<T = any> = z.infer<typeof ApiResponseSchema> & { data?: T };

export * from './tasks.schema';