import { db } from '../database';
import { getActiveSeason } from './season.service';

type LeaderboardItem = {
    rank: number;
    userId: string;
    username: string;
    level: number;
    exp: number;
};

type LeaderboardResult = {
    season: {
        id: string;
        name: string;
    };
    leaderboard: LeaderboardItem[];
};

export async function getLeaderboardData(): Promise<LeaderboardResult> {
    console.log('[LeaderboardService] Fetching leaderboard data...');
    const activeSeason = await getActiveSeason();

    const leaderboard = await db.userSeasonProgress.findMany({
        where: {
            seasonId: activeSeason.id,
        },
        include: {
            user: true,
        },
        orderBy: [
            {
                exp: 'desc',
            },
            {
                updatedAt: 'asc',
            },
        ],
        take: 50,
    });

    console.log(
        `[LeaderboardService] Loaded ${leaderboard.length} entries from active season ${activeSeason.id}.`
    );

    return {
        season: {
            id: activeSeason.id,
            name: activeSeason.name,
        },
        leaderboard: leaderboard.map((entry, index) => ({
            rank: index + 1,
            userId: entry.userId,
            username: entry.user.name || entry.user.email,
            level: entry.level,
            exp: entry.exp,
        })),
    };
}
