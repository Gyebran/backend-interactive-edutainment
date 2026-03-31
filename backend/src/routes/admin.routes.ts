import { NextFunction, Request, Response, Router } from 'express';
import { createAdminAccount, updateUserAdminId, updateUserStudentId } from '../controllers/admin.controller';

const router = Router();

function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
    const adminSecret = process.env.ADMIN_SECRET || process.env.SEASON_ADMIN_SECRET;

    if (!adminSecret) {
        return res.status(503).json({
            error: 'Admin secret is not configured.',
        });
    }

    const providedSecret = req.header('x-admin-secret');

    if (providedSecret !== adminSecret) {
        return res.status(403).json({
            error: 'Forbidden.',
        });
    }

    return next();
}

router.use(requireAdminSecret);
router.post('/register', createAdminAccount);
router.patch('/user/:id/student-id', updateUserStudentId);
router.patch('/user/:id/admin-id', updateUserAdminId);

export default router;
