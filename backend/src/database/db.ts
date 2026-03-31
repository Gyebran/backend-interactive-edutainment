import { PrismaClient } from '@prisma/client';

declare global {
    // Reuse the same Prisma client across reloads in development.
    // eslint-disable-next-line no-var
    var __interactiveEdutainmentPrisma__: PrismaClient | undefined;
}

const prisma =
    global.__interactiveEdutainmentPrisma__ ??
    new PrismaClient({
        log: ['warn', 'error'],
    });

if (process.env.NODE_ENV !== 'production') {
    global.__interactiveEdutainmentPrisma__ = prisma;
}

export const db = prisma;
export const prismaClient = prisma;
