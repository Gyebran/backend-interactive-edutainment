import { NextFunction, Request, Response } from 'express';

export function notFoundHandler(_req: Request, res: Response) {
    return res.status(404).json({
        error: 'Route not found.',
    });
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) {
        return next(err);
    }

    console.error('[ErrorHandler]', err);

    const statusCode =
        typeof err === 'object' &&
        err !== null &&
        'statusCode' in err &&
        typeof (err as { statusCode?: unknown }).statusCode === 'number'
            ? (err as { statusCode: number }).statusCode
            : typeof err === 'object' &&
                err !== null &&
                'status' in err &&
                typeof (err as { status?: unknown }).status === 'number'
                ? (err as { status: number }).status
                : 500;

    const message =
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Internal Server Error';

    return res.status(statusCode).json({
        error: message || 'Internal Server Error',
    });
}
