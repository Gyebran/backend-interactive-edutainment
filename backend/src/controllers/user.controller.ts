import { Response } from 'express';
import { db } from '../database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getActiveSeason, getOrCreateUserSeasonProgress } from '../services/season.service';

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
    try {
        const currentUserId = req.auth?.userId;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const user = await db.user.findUnique({
            where: {
                id: currentUserId,
            },
            select: {
                id: true,
                email: true,
                studentId: true,
                adminId: true,
                role: true,
                name: true,
                exp: true,
                level: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const activeSeason = await getActiveSeason();
        const seasonProgress = await getOrCreateUserSeasonProgress(currentUserId, activeSeason.id);

        return res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            studentId: user.studentId,
            adminId: user.adminId,
            role: user.role,
            exp: seasonProgress.exp,
            level: seasonProgress.level,
            season: {
                id: activeSeason.id,
                name: activeSeason.name,
                startDate: activeSeason.startDate,
                endDate: activeSeason.endDate,
            },
            allTime: {
                exp: user.exp,
                level: user.level,
            },
        });
    } catch (error) {
        console.error('[UserController] Failed to fetch current user:', error);
        return res.status(500).json({ error: 'Failed to fetch current user.' });
    }
}
