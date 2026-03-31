import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from "../database";

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';
const AUTH_COOKIE_NAME = 'interactive_edutainment_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function buildAuthCookie(token: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
        COOKIE_MAX_AGE_MS / 1000
    )}${isProduction ? '; Secure' : ''}`;
}

function buildClearAuthCookie() {
    const isProduction = process.env.NODE_ENV === 'production';
    return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`;
}

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check existing user
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await db.user.create({
            data: {
                email,
                role: 'student',
                password: hashedPassword,
                name
            }
        });

        return res.json({
            success: true,
            userId: user.id,
            studentId: user.studentId,
            adminId: user.adminId,
            role: user.role,
        });
    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await db.user.findUnique({ where: { email } });
        if (!user || user.password === null) {
            // Note: user.password can be null if it's an old user from before this feature
            // In that case, they can't login via password.
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.setHeader('Set-Cookie', buildAuthCookie(token));

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                studentId: user.studentId,
                adminId: user.adminId,
                role: user.role,
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const logout = async (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', buildClearAuthCookie());
    return res.json({ success: true });
};
