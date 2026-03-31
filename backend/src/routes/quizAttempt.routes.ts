import { Response, Router } from 'express';
import { AuthenticatedRequest, authenticateRequest } from '../middleware/auth.middleware';
import {
    createQuizAttemptForUser,
    getQuizAttemptDetailForUser,
    listQuizAttemptsForUser,
} from '../services/quizAttempt.service';

const router = Router();

router.use(authenticateRequest);

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const currentUserId = req.auth?.userId;
        const { quizId, answers } = req.body;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        if (typeof quizId !== 'string' || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid quiz attempt payload.' });
        }

        const attempt = await createQuizAttemptForUser(
            { userId: currentUserId },
            quizId,
            answers
        );

        return res.status(201).json({
            success: true,
            id: attempt.attemptId,
            attemptId: attempt.attemptId,
            score: attempt.score,
            correctCount: attempt.correctCount,
            totalQuestions: attempt.totalQuestions,
            createdAt: attempt.createdAt,
            expGained: attempt.expGained,
            newLevel: attempt.newLevel,
            leveledUp: attempt.leveledUp,
            totalExp: attempt.totalExp,
            allTimeExp: attempt.allTimeExp,
            seasonName: attempt.seasonName,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return res.status(401).json({ error: 'Unauthorized.' });
            }

            if (error.message === 'EMPTY_ANSWERS') {
                return res.status(400).json({ error: 'Answers cannot be empty.' });
            }

            if (error.message === 'QUIZ_NOT_FOUND') {
                return res.status(404).json({ error: 'Quiz not found.' });
            }

            if (error.message === 'USER_NOT_FOUND') {
                return res.status(404).json({ error: 'User not found.' });
            }

            if (
                error.message === 'INVALID_ANSWER_PAYLOAD' ||
                error.message === 'DUPLICATE_QUESTION_ANSWER' ||
                error.message === 'ANSWER_OPTION_MISMATCH'
            ) {
                return res.status(400).json({ error: 'Invalid quiz attempt payload.' });
            }
        }

        console.error('[QuizAttemptRoutes] Failed to save quiz attempt:', error);
        return res.status(500).json({ error: 'Failed to save quiz attempt.' });
    }
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const currentUserId = req.auth?.userId;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const attempts = await listQuizAttemptsForUser({ userId: currentUserId });

        return res.json(attempts);
    } catch (error) {
        console.error('[QuizAttemptRoutes] Failed to fetch quiz attempts:', error);
        return res.status(500).json({ error: 'Failed to fetch quiz attempts.' });
    }
});

router.get('/:attemptId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const currentUserId = req.auth?.userId;
        const { attemptId } = req.params;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        if (!attemptId) {
            return res.status(400).json({ error: 'attemptId is required.' });
        }

        const attempt = await getQuizAttemptDetailForUser({ userId: currentUserId }, attemptId);

        if (!attempt) {
            return res.status(404).json({ error: 'Quiz attempt not found.' });
        }

        return res.json(attempt);
    } catch (error) {
        console.error('[QuizAttemptRoutes] Failed to fetch quiz attempt detail:', error);
        return res.status(500).json({ error: 'Failed to fetch quiz attempt detail.' });
    }
});

export default router;
