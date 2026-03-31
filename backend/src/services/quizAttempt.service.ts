import { db } from '../database';
import { calculateLevel } from '../utils/level.util';
import { getActiveSeason } from './season.service';

type SubmittedAnswerInput = {
    questionId: string;
    selectedOptionId?: string | null;
};

type AuthContext = {
    userId: string;
};

function roundScore(value: number) {
    return Math.round(value * 100) / 100;
}

function formatQuizLabel(quizId: string) {
    return `Quiz #${quizId.slice(0, 8)}`;
}

function calculateExpGain(correctCount: number, score: number) {
    let expGain = 20 + correctCount * 5;

    if (score >= 80) {
        expGain += 15;
    }

    if (score === 100) {
        expGain += 30;
    }

    return expGain;
}

export async function createQuizAttemptForUser(
    auth: AuthContext,
    quizId: string,
    submittedAnswers: SubmittedAnswerInput[]
) {
    if (!auth?.userId) {
        throw new Error('UNAUTHORIZED');
    }

    if (!Array.isArray(submittedAnswers) || submittedAnswers.length === 0) {
        throw new Error('EMPTY_ANSWERS');
    }

    console.log('Saving quiz attempt:', {
        userId: auth.userId,
        quizId,
        answersCount: submittedAnswers.length,
    });

    const quiz = await db.quiz.findFirst({
        where: {
            id: quizId,
            uploadData: {
                userId: auth.userId,
            },
        },
        include: {
            questions: {
                orderBy: {
                    createdAt: 'asc',
                },
                include: {
                    options: true,
                },
            },
        },
    });

    if (!quiz) {
        throw new Error('QUIZ_NOT_FOUND');
    }

    const answersByQuestionId = new Map<string, SubmittedAnswerInput>();
    const quizQuestionIds = new Set(quiz.questions.map((question) => question.id));

    for (const answer of submittedAnswers) {
        if (!answer || typeof answer.questionId !== 'string') {
            throw new Error('INVALID_ANSWER_PAYLOAD');
        }

        if (answersByQuestionId.has(answer.questionId)) {
            throw new Error('DUPLICATE_QUESTION_ANSWER');
        }

        answersByQuestionId.set(answer.questionId, answer);
    }

    for (const questionId of answersByQuestionId.keys()) {
        if (!quizQuestionIds.has(questionId)) {
            throw new Error('ANSWER_OPTION_MISMATCH');
        }
    }

    const answerRows = quiz.questions.map((question) => {
        const submittedAnswer = answersByQuestionId.get(question.id);

        if (!submittedAnswer || !submittedAnswer.selectedOptionId) {
            return {
                questionId: question.id,
                selectedOptionId: null,
                isCorrect: false,
            };
        }

        const matchedOption = question.options.find((option) => option.id === submittedAnswer.selectedOptionId);

        if (!matchedOption) {
            throw new Error('ANSWER_OPTION_MISMATCH');
        }

        return {
            questionId: question.id,
            selectedOptionId: matchedOption.id,
            isCorrect: matchedOption.isCorrect,
        };
    });

    const totalQuestions = quiz.questions.length;
    const correctCount = answerRows.filter((answer) => answer.isCorrect).length;
    const score = totalQuestions === 0 ? 0 : roundScore((correctCount / totalQuestions) * 100);

    const expGain = calculateExpGain(correctCount, score);
    const activeSeason = await getActiveSeason();

    const result = await db.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
            where: {
                id: auth.userId,
            },
            select: {
                id: true,
                studentId: true,
                exp: true,
                level: true,
            },
        });

        if (!currentUser) {
            throw new Error('USER_NOT_FOUND');
        }

        const attempt = await tx.quizAttempt.create({
            data: {
                userId: auth.userId,
                quizId: quiz.id,
                studentId: currentUser.studentId,
                score,
                correctCount,
                totalQuestions,
                answers: {
                    create: answerRows,
                },
            },
        });

        const currentProgress =
            (await tx.userSeasonProgress.findUnique({
                where: {
                    userId_seasonId: {
                        userId: auth.userId,
                        seasonId: activeSeason.id,
                    },
                },
            })) ??
            (await tx.userSeasonProgress.create({
                data: {
                    userId: auth.userId,
                    seasonId: activeSeason.id,
                    studentId: currentUser.studentId,
                },
            }));

        const updatedSeasonExp = currentProgress.exp + expGain;
        const newSeasonLevel = calculateLevel(updatedSeasonExp);
        const leveledUp = newSeasonLevel > currentProgress.level;

        await tx.userSeasonProgress.update({
            where: {
                userId_seasonId: {
                    userId: auth.userId,
                    seasonId: activeSeason.id,
                },
            },
            data: {
                exp: updatedSeasonExp,
                level: newSeasonLevel,
            },
        });

        const updatedAllTimeExp = currentUser.exp + expGain;
        const newAllTimeLevel = calculateLevel(updatedAllTimeExp);

        await tx.user.update({
            where: {
                id: auth.userId,
            },
            data: {
                exp: updatedAllTimeExp,
                level: newAllTimeLevel,
            },
        });

        return {
            attempt,
            expGain,
            newLevel: newSeasonLevel,
            leveledUp,
            updatedExp: updatedSeasonExp,
            allTimeExp: updatedAllTimeExp,
            season: activeSeason,
        };
    });

    return {
        attemptId: result.attempt.id,
        score: result.attempt.score,
        correctCount: result.attempt.correctCount,
        totalQuestions: result.attempt.totalQuestions,
        createdAt: result.attempt.createdAt,
        expGained: result.expGain,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp,
        totalExp: result.updatedExp,
        allTimeExp: result.allTimeExp,
        seasonName: result.season?.name,
    };
}

export async function listQuizAttemptsForUser(auth: AuthContext) {
    const attempts = await db.quizAttempt.findMany({
        where: {
            userId: auth.userId,
        },
        include: {
            quiz: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return attempts.map((attempt) => ({
        id: attempt.id,
        quizId: attempt.quizId,
        quizName: formatQuizLabel(attempt.quiz.id),
        score: attempt.score,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        createdAt: attempt.createdAt,
    }));
}

export async function getQuizAttemptDetailForUser(auth: AuthContext, attemptId: string) {
    const attempt = await db.quizAttempt.findFirst({
        where: {
            id: attemptId,
            userId: auth.userId,
        },
        include: {
            quiz: {
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
            },
            answers: {
                include: {
                    question: true,
                    selectedOption: true,
                },
                orderBy: {
                    question: {
                        createdAt: 'asc',
                    },
                },
            },
        },
    });

    if (!attempt) {
        return null;
    }

    return {
        id: attempt.id,
        score: attempt.score,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        createdAt: attempt.createdAt,
        quiz: {
            id: attempt.quiz.id,
            quizId: attempt.quiz.id,
            quizName: formatQuizLabel(attempt.quiz.id),
            difficulty: attempt.quiz.difficulty,
            questionCount: attempt.quiz.questionCount,
            createdAt: attempt.quiz.createdAt,
            questions: attempt.quiz.questions.map((question) => ({
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
        },
        answers: attempt.answers.map((answer) => ({
            id: answer.id,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            isCorrect: answer.isCorrect,
            selectedOption: answer.selectedOption
                ? {
                    id: answer.selectedOption.id,
                    optionText: answer.selectedOption.optionText,
                }
                : null,
            question: {
                id: answer.question.id,
                questionText: answer.question.questionText,
            },
        })),
    };
}
