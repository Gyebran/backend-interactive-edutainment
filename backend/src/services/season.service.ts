import { db } from '../database';
import { Prisma } from '@prisma/client';
import { getStudentIdSnapshotByUserId } from '../utils/studentId.util';

function buildSeasonWindow(date: Date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const firstSemester = month < 6;

    return {
        name: `Semester ${firstSemester ? 1 : 2} ${year}`,
        startDate: firstSemester
            ? new Date(Date.UTC(year, 0, 1, 0, 0, 0))
            : new Date(Date.UTC(year, 6, 1, 0, 0, 0)),
        endDate: firstSemester
            ? new Date(Date.UTC(year, 5, 30, 23, 59, 59))
            : new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
    };
}

type SeasonMutationInput = {
    name: string;
    startDate: Date;
    endDate: Date;
    isActive?: boolean;
};

function validateSeasonDates(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('INVALID_SEASON_DATES');
    }

    if (startDate >= endDate) {
        throw new Error('INVALID_SEASON_RANGE');
    }
}

async function deactivateOtherSeasons(tx: Prisma.TransactionClient, activeSeasonId: string) {
    await tx.season.updateMany({
        where: {
            isActive: true,
            id: {
                not: activeSeasonId,
            },
        },
        data: {
            isActive: false,
        },
    });
}

export async function getActiveSeason() {
    const now = new Date();

    const existingActiveSeason = await db.season.findFirst({
        where: {
            isActive: true,
            startDate: {
                lte: now,
            },
            endDate: {
                gte: now,
            },
        },
        orderBy: {
            startDate: 'desc',
        },
    });

    if (existingActiveSeason) {
        return existingActiveSeason;
    }

    const seasonWindow = buildSeasonWindow(now);

    const matchingSeason = await db.season.findFirst({
        where: {
            startDate: seasonWindow.startDate,
            endDate: seasonWindow.endDate,
        },
    });

    if (matchingSeason) {
        await db.season.updateMany({
            where: {
                isActive: true,
                id: {
                    not: matchingSeason.id,
                },
            },
            data: {
                isActive: false,
            },
        });

        return db.season.update({
            where: {
                id: matchingSeason.id,
            },
            data: {
                isActive: true,
            },
        });
    }

    return db.$transaction(async (tx) => {
        await tx.season.updateMany({
            where: {
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        return tx.season.create({
            data: {
                name: seasonWindow.name,
                startDate: seasonWindow.startDate,
                endDate: seasonWindow.endDate,
                isActive: true,
            },
        });
    });
}

export async function listSeasons() {
    return db.season.findMany({
        orderBy: [
            {
                isActive: 'desc',
            },
            {
                startDate: 'desc',
            },
        ],
    });
}

export async function createSeason(input: SeasonMutationInput) {
    validateSeasonDates(input.startDate, input.endDate);

    return db.$transaction(async (tx) => {
        const season = await tx.season.create({
            data: {
                name: input.name,
                startDate: input.startDate,
                endDate: input.endDate,
                isActive: Boolean(input.isActive),
            },
        });

        if (season.isActive) {
            await deactivateOtherSeasons(tx, season.id);
        }

        return season;
    });
}

export async function activateSeason(seasonId: string) {
    if (!seasonId) {
        throw new Error('SEASON_ID_REQUIRED');
    }

    return db.$transaction(async (tx) => {
        const season = await tx.season.findUnique({
            where: {
                id: seasonId,
            },
        });

        if (!season) {
            throw new Error('SEASON_NOT_FOUND');
        }

        await deactivateOtherSeasons(tx, season.id);

        return tx.season.update({
            where: {
                id: season.id,
            },
            data: {
                isActive: true,
            },
        });
    });
}

export async function getOrCreateUserSeasonProgress(userId: string, seasonId: string) {
    const existingProgress = await db.userSeasonProgress.findUnique({
        where: {
            userId_seasonId: {
                userId,
                seasonId,
            },
        },
    });

    if (existingProgress) {
        return existingProgress;
    }

    const studentId = await getStudentIdSnapshotByUserId(userId);

    return db.userSeasonProgress.create({
        data: {
            userId,
            seasonId,
            studentId,
        },
    });
}
