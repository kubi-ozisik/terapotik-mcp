import type { ApiResponse } from '../schemas';

// API response helpers
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
  };
}

export function createErrorResponse(message: string, errors?: string[]): ApiResponse {
  return {
    status: 'error',
    message,
  };
}

// Database helpers
export function handleDatabaseError(error: any): never {
  console.error('Database error:', error);
  
  if (error.code === 'P2002') {
    throw new Error('A record with this data already exists');
  }
  
  if (error.code === 'P2025') {
    throw new Error('Record not found');
  }
  
  throw new Error('Database operation failed');
}

// Environment validation
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}