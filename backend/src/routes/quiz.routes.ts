import { Router } from 'express';
import { getQuizDetail, getQuizList } from '../controllers/quiz.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateRequest);

router.get('/', getQuizList);
router.get('/:quizId', getQuizDetail);

export default router;
