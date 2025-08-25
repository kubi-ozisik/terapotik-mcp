import { PrismaClient } from '../generated/prisma';

// Global instance to prevent multiple connections
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Connection management for MongoDB
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

// Export your actual types from generated Prisma client
export type { 
  User, 
  Account, 
  Session, 
  VerificationToken, 
  ServiceToken 
} from '../generated/prisma';
export { Prisma } from '../generated/prisma';