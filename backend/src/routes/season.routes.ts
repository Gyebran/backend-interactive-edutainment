import { NextFunction, Request, Response, Router } from 'express';
import {
    activateSeasonController,
    createSeasonController,
    getActiveSeasonController,
    listSeasonsController,
} from '../controllers/season.controller';

const router = Router();

function requireSeasonAdmin(req: Request, res: Response, next: NextFunction) {
    const adminSecret = process.env.SEASON_ADMIN_SECRET;

    if (!adminSecret) {
        return res.status(503).json({
            error: 'Season admin secret is not configured.',
        });
    }

    const providedSecret = req.header('x-season-admin-secret');

    if (providedSecret !== adminSecret) {
        return res.status(403).json({
            error: 'Forbidden.',
        });
    }

    return next();
}

router.get('/active', getActiveSeasonController);
router.get('/', requireSeasonAdmin, listSeasonsController);
router.post('/', requireSeasonAdmin, createSeasonController);
router.post('/:seasonId/activate', requireSeasonAdmin, activateSeasonController);

export default router;
