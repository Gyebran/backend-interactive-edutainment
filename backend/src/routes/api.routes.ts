import { Router } from 'express';
import { generateContent } from '../controllers/ai.controller';
import { analyzeImageUpload } from '../controllers/upload.controller';
import { register, login, logout } from '../controllers/auth.controller';
import { getLeaderboard } from '../controllers/leaderboard.controller';
import { getCurrentUser } from '../controllers/user.controller';
import { processPdfUpload } from '../controllers/rag.controller';
import chatbotRoutes from './chatbot.routes';
import chatRoutes from './chat.routes';
import askAIRoutes from './askAI.routes';
import quizRoutes from './quiz.routes';
import quizAttemptRoutes from './quizAttempt.routes';
import seasonRoutes from './season.routes';
import adminRoutes from './admin.routes';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/user/me', authenticateRequest, getCurrentUser);
router.get('/leaderboard', getLeaderboard);
router.use('/seasons', seasonRoutes);
router.use('/admin', adminRoutes);

// AI Generation (Text)
router.post('/generate', generateContent);

// Image Upload & Analysis
router.post('/upload/analyze', authenticateRequest, analyzeImageUpload);

// PDF Upload & Analysis (RAG)
router.post('/upload/pdf', authenticateRequest, processPdfUpload);

// Quiz
router.use('/quiz', quizRoutes);
router.use('/quiz-attempt', quizAttemptRoutes);

// Chatbot
router.use('/chat', chatRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/ask-ai', askAIRoutes);

export default router;
