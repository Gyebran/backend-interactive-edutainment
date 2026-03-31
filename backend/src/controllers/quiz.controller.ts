import { Request, Response } from 'express';
import { db } from '../database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getQuizList = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const currentUserId = req.auth?.userId;

        if (!currentUserId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        const quizzes = await db.quiz.findMany({
            where: {
                uploadData: {
                    userId: currentUserId,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                _count: {
                    select: {
                        questions: true,
                    },
                },
            },
        });

        return res.json({
            quizzes: quizzes.map((quiz) => ({
                quizId: quiz.id,
                uploadDataId: quiz.uploadDataId,
                difficulty: quiz.difficulty,
                questionCount: quiz.questionCount || quiz._count.questions,
                createdAt: quiz.createdAt,
            })),
        });
    } catch (error) {
        console.error('[QuizController] Failed to fetch quiz list:', error);
        return res.status(500).json({
            error: 'Failed to fetch quiz list.',
        });
    }
};

export const getQuizDetail = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { quizId } = req.params;
        const currentUserId = req.auth?.userId;

        if (!quizId) {
            return res.status(400).json({ error: 'quizId is required.' });
        }

        if (!currentUserId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        const quiz = await db.quiz.findFirst({
            where: {
                id: quizId,
                uploadData: {
                    userId: currentUserId,
                },
            },
            include: {
                questions: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                    include: {
                        options: {
                            orderBy: {
                                id: 'asc',
                            },
                        },
                    },
                },
            },
        });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found.' });
        }

        return res.json({
            quizId: quiz.id,
            difficulty: quiz.difficulty,
            questionCount: quiz.questionCount,
            createdAt: quiz.createdAt,
            questions: quiz.questions.map((question) => ({
                id: question.id,
                type: question.type,
                questionText: question.questionText,
                answer: question.answer,
                explanation: question.explanation,
                options: question.options.map((option) => ({
                    id: option.id,
                    optionText: option.optionText,
                    isCorrect: option.isCorrect,
                })),
                correctOptionId:
                    question.options.find((option) => option.isCorrect)?.id ?? null,
            })),
        });
    } catch (error) {
        console.error('[QuizController] Failed to fetch quiz detail:', error);
        return res.status(500).json({
            error: 'Failed to fetch quiz detail.',
        });
    }
};
