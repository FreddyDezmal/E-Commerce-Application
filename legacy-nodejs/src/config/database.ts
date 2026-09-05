import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';

export const prisma = new PrismaClient({
  log: isProduction ? ['error', 'warn'] : ['warn', 'error']
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
