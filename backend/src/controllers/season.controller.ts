import { Request, Response } from 'express';
import { activateSeason, createSeason, getActiveSeason, listSeasons } from '../services/season.service';

function parseDateInput(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export async function getActiveSeasonController(_req: Request, res: Response) {
    try {
        const season = await getActiveSeason();

        return res.json({
            success: true,
            season,
        });
    } catch (error) {
        console.error('[SeasonController] Failed to fetch active season:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch active season.',
        });
    }
}

export async function listSeasonsController(_req: Request, res: Response) {
    try {
        const seasons = await listSeasons();

        return res.json({
            success: true,
            seasons,
        });
    } catch (error) {
        console.error('[SeasonController] Failed to list seasons:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to list seasons.',
        });
    }
}

export async function createSeasonController(req: Request, res: Response) {
    try {
        const { name, startDate, endDate, isActive } = req.body ?? {};

        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Season name is required.' });
        }

        const parsedStartDate = parseDateInput(startDate);
        const parsedEndDate = parseDateInput(endDate);

        if (!parsedStartDate || !parsedEndDate) {
            return res.status(400).json({ error: 'Valid startDate and endDate are required.' });
        }

        const season = await createSeason({
            name: name.trim(),
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            isActive: Boolean(isActive),
        });

        return res.status(201).json({
            success: true,
            season,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'INVALID_SEASON_DATES') {
                return res.status(400).json({ error: 'Season dates are invalid.' });
            }

            if (error.message === 'INVALID_SEASON_RANGE') {
                return res.status(400).json({ error: 'Season endDate must be after startDate.' });
            }
        }

        console.error('[SeasonController] Failed to create season:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to create season.',
        });
    }
}

export async function activateSeasonController(req: Request, res: Response) {
    try {
        const { seasonId } = req.params;

        if (!seasonId) {
            return res.status(400).json({ error: 'seasonId is required.' });
        }

        const season = await activateSeason(seasonId);

        return res.json({
            success: true,
            season,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'SEASON_ID_REQUIRED') {
                return res.status(400).json({ error: 'seasonId is required.' });
            }

            if (error.message === 'SEASON_NOT_FOUND') {
                return res.status(404).json({ error: 'Season not found.' });
            }
        }

        console.error('[SeasonController] Failed to activate season:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to activate season.',
        });
    }
}
