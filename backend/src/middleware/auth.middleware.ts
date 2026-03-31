import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';
const AUTH_COOKIE_NAME = 'interactive_edutainment_token';

export type AuthenticatedRequest = Request & {
    auth?: {
        userId: string;
        email?: string;
    };
};

type TokenPayload = {
    userId: string;
    email?: string;
};

function readCookieToken(cookieHeader?: string) {
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const authCookie = cookies.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));

    if (!authCookie) {
        return null;
    }

    return authCookie.slice(`${AUTH_COOKIE_NAME}=`.length).trim() || null;
}

export function authenticateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authorizationHeader = req.headers.authorization;
    const bearerToken =
        authorizationHeader && authorizationHeader.startsWith('Bearer ')
            ? authorizationHeader.slice('Bearer '.length).trim()
            : null;
    const cookieToken = readCookieToken(req.headers.cookie);
    const token = bearerToken || cookieToken;

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized.',
        });
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET) as TokenPayload;

        if (!decodedToken?.userId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        req.auth = {
            userId: decodedToken.userId,
            email: decodedToken.email,
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid token.',
        });
    }
}
