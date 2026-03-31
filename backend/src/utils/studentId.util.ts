import { Prisma, PrismaClient } from '@prisma/client';
import { db } from '../database';

type StudentIdClient = Pick<PrismaClient, 'user'> | Prisma.TransactionClient;

export function normalizeStudentId(studentId: string) {
    return studentId.trim();
}

export function buildTemporaryStudentId(seed: string) {
    const normalizedSeed = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const safeSeed = normalizedSeed || `USER${Date.now()}`;
    return `STU-${safeSeed}`;
}

export function validateStudentId(studentId: unknown) {
    if (typeof studentId !== 'string') {
        return null;
    }

    const normalizedStudentId = normalizeStudentId(studentId);

    if (normalizedStudentId.length < 5) {
        return null;
    }

    return normalizedStudentId;
}

export function assertValidStudentId(studentId: unknown) {
    const normalizedStudentId = validateStudentId(studentId);

    if (!normalizedStudentId) {
        throw new Error('INVALID_STUDENT_ID');
    }

    return normalizedStudentId;
}

export async function getStudentIdSnapshotByUserId(userId: string, client: StudentIdClient = db) {
    const user = await client.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            studentId: true,
        },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    return user.studentId ?? null;
}
