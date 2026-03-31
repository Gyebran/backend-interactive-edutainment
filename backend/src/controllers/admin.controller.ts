import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { db } from '../database';
import { assertValidStudentId } from '../utils/studentId.util';
import { assertValidAdminId } from '../utils/adminId.util';

export async function createAdminAccount(req: Request, res: Response) {
    try {
        const { email, password, name, adminId } = req.body ?? {};

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required.',
            });
        }

        const normalizedAdminId = assertValidAdminId(adminId);

        const existingUser = await db.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                studentId: null,
                adminId: normalizedAdminId,
                role: 'admin',
            },
            select: {
                id: true,
                email: true,
                name: true,
                studentId: true,
                adminId: true,
                role: true,
            },
        });

        return res.status(201).json({
            success: true,
            user,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_ADMIN_ID') {
            return res.status(400).json({
                error: 'adminId must be a non-empty string with minimum length 5.',
            });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return res.status(409).json({
                error: 'adminId already exists.',
            });
        }

        console.error('[AdminController] Failed to create admin account:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to create admin account.',
        });
    }
}

export async function updateUserStudentId(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { studentId } = req.body ?? {};

        if (!id) {
            return res.status(400).json({ error: 'User id is required.' });
        }

        const normalizedStudentId = assertValidStudentId(studentId);

        const user = await db.user.update({
            where: {
                id,
            },
            data: {
                studentId: normalizedStudentId,
                adminId: null,
                role: 'student',
            },
            select: {
                id: true,
                email: true,
                name: true,
                studentId: true,
                adminId: true,
                role: true,
            },
        });

        return res.json({
            success: true,
            user,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_STUDENT_ID') {
            return res.status(400).json({
                error: 'studentId must be a non-empty string with minimum length 5.',
            });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return res.status(409).json({
                error: 'studentId already exists.',
            });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            return res.status(404).json({
                error: 'User not found.',
            });
        }

        console.error('[AdminController] Failed to update studentId:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to update studentId.',
        });
    }
}

export async function updateUserAdminId(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { adminId } = req.body ?? {};

        if (!id) {
            return res.status(400).json({ error: 'User id is required.' });
        }

        const normalizedAdminId = assertValidAdminId(adminId);

        const user = await db.user.update({
            where: {
                id,
            },
            data: {
                studentId: null,
                adminId: normalizedAdminId,
                role: 'admin',
            },
            select: {
                id: true,
                email: true,
                name: true,
                studentId: true,
                adminId: true,
                role: true,
            },
        });

        return res.json({
            success: true,
            user,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_ADMIN_ID') {
            return res.status(400).json({
                error: 'adminId must be a non-empty string with minimum length 5.',
            });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return res.status(409).json({
                error: 'adminId already exists.',
            });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            return res.status(404).json({
                error: 'User not found.',
            });
        }

        console.error('[AdminController] Failed to update adminId:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to update adminId.',
        });
    }
}
