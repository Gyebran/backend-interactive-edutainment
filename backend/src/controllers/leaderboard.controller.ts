import { Request, Response } from 'express';
import { getLeaderboardData } from '../services/leaderboard.service';

export async function getLeaderboard(_req: Request, res: Response) {
    try {
        console.log('[LeaderboardController] GET /api/leaderboard');
        const result = await getLeaderboardData();

        return res.status(200).json({
            success: true,
            season: result.season,
            leaderboard: result.leaderboard,
        });
    } catch (error) {
        console.error('[LeaderboardController] Failed to fetch leaderboard:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch leaderboard.',
        });
    }
}
