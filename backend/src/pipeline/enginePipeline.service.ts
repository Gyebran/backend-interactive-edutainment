import { db } from "../database";
import { generateQuizFromDescription } from "../services/quiz-engine/quizEngine.service";
import crypto from 'crypto';
import { DifficultyLevel, Prisma } from "@prisma/client";
import { getStudentIdSnapshotByUserId } from "../utils/studentId.util";
import { assertValidQuizDescription } from "./quizDescription.util";

type QuizConfig = {
    difficulty: string;
    questionCount: number;
    language: string;
};

function normalizeQuizConfig(input: unknown): QuizConfig {
    const rawConfig = (input ?? {}) as Partial<QuizConfig>;
    const parsedQuestionCount = Number.parseInt(String(rawConfig.questionCount ?? 10), 10);

    return {
        difficulty: typeof rawConfig.difficulty === "string" && rawConfig.difficulty.trim() !== ""
            ? rawConfig.difficulty
            : "random",
        questionCount: Number.isInteger(parsedQuestionCount) && parsedQuestionCount > 0
            ? parsedQuestionCount
            : 10,
        language: typeof rawConfig.language === "string" && rawConfig.language.trim() !== ""
            ? rawConfig.language
            : "id",
    };
}

function mapDifficultyToPrismaLevel(rawDifficulty: unknown): DifficultyLevel {
    const normalized = typeof rawDifficulty === "string" ? rawDifficulty.trim().toLowerCase() : "";

    switch (normalized) {
        case "beginner":
        case "easy":
            return DifficultyLevel.easy;
        case "intermediate":
        case "medium":
            return DifficultyLevel.medium;
        case "advanced":
        case "hard":
            return DifficultyLevel.hard;
        default:
            console.warn(`[EnginePipeline] Unknown difficulty "${String(rawDifficulty)}". Falling back to "medium".`);
            return DifficultyLevel.medium;
    }
}

/**
 * Main orchestrator for the quiz generation pipeline.
 * Fetches the UploadData, extracts the description, 
 * calls the Quiz Engine, and stores generated questions.
 * 
 * @param uploadDataId UUID of the uploaded document
 */
export async function runQuizGenerationPipeline(uploadDataId: string): Promise<void> {
    try {
        console.log("Quiz pipeline triggered:", uploadDataId);
        console.log(`[EnginePipeline] Starting pipeline for UploadData: ${uploadDataId}`);

        // 1. Fetch UploadData
        const uploadData = await db.uploadData.findUnique({
            where: { id: uploadDataId }
        });

        if (!uploadData) {
            console.warn(`[EnginePipeline] UploadData not found for ID: ${uploadDataId}`);
            return;
        }

        // 2. Read description from aiContent
        const aiContent = uploadData.aiContent as any;
        console.log("Description:", aiContent);
        const description = assertValidQuizDescription(aiContent);

        // Create a description hash to track identical content
        const descriptionHash = crypto.createHash('sha256').update(description).digest('hex');

        // 7. Prevent duplicate quiz creation
        const existingQuiz = await (db as any).quiz.findFirst({
            where: {
                uploadDataId,
                descriptionHash
            }
        });

        if (existingQuiz) {
            console.info(`[EnginePipeline] Quiz already exists for this description. UploadData ID: ${uploadDataId}`);
            return;
        }

        // 4. Extract Quiz Configuration
        const quizConfig = normalizeQuizConfig(aiContent?.quizConfig);
        const questionCount = quizConfig.questionCount;
        let difficultyDistribution = null;

        if (quizConfig.difficulty === "random") {
            const baseCount = Math.floor(questionCount / 3);
            const remainder = questionCount % 3;

            difficultyDistribution = {
                easy: baseCount + remainder,
                medium: baseCount,
                hard: baseCount
            };
        }

        console.log(`[EnginePipeline] Generating Quiz for UploadData ID: ${uploadDataId} with config: ${JSON.stringify(quizConfig)}...`);

        // 5. Call quiz generation engine with config and distribution
        // 6. Validate quiz JSON (handled internally by generateQuizFromDescription)
        const generatedQuiz = await generateQuizFromDescription(description, { ...quizConfig, questionCount, difficultyDistribution }, 2);
        console.log("Generated quiz:", JSON.stringify(generatedQuiz));

        if (!generatedQuiz || !generatedQuiz.questions || generatedQuiz.questions.length === 0) {
            console.warn(`[EnginePipeline] Engine failed to return valid questions for ID: ${uploadDataId}`);
            return;
        }

        if (!generatedQuiz.questions || generatedQuiz.questions.length === 0) {
            throw new Error("No quiz questions generated");
        }

        const actualQuestionCount = generatedQuiz.questions.length;

        if (actualQuestionCount !== questionCount) {
            console.warn(
                `[EnginePipeline] Generated question count (${actualQuestionCount}) differs from requested count (${questionCount}). Saving actual count.`
            );
        }

        console.log("Quiz generated:", actualQuestionCount);

        console.log(`[EnginePipeline] Saving ${actualQuestionCount} questions to database...`);
        console.log("Saving quiz to database");

        // 7. Save quiz and questions into database
        try {
            const studentId = await getStudentIdSnapshotByUserId(uploadData.userId);
            const questionsCreateData = generatedQuiz.questions.map((q) => {
                const difficultyLevel = mapDifficultyToPrismaLevel(q.difficulty);
                const optionsData: Prisma.QuestionOptionCreateWithoutQuestionInput[] = Array.isArray(q.options)
                    ? q.options.map((option) => ({
                        optionText: option.optionText,
                        isCorrect: option.isCorrect
                    }))
                    : [];

                if (optionsData.length !== 4) {
                    throw new Error(`Question "${q.questionText}" must contain exactly 4 options.`);
                }

                const correctOptionCount = optionsData.filter((option) => option.isCorrect).length;
                if (correctOptionCount !== 1) {
                    throw new Error(`Question "${q.questionText}" must contain exactly 1 correct option.`);
                }

                const correctAnswer = optionsData.find((option) => option.isCorrect)?.optionText ?? null;

                return {
                    type: "multiple_choice" as const,
                    questionText: q.questionText,
                    answer: correctAnswer,
                    explanation: q.explanation || null,
                    difficulty: difficultyLevel,
                    options: {
                        create: optionsData
                    }
                };
            });

            await db.quiz.create({
                data: {
                    uploadDataId,
                    studentId,
                    descriptionHash,
                    difficulty: quizConfig.difficulty,
                    questionCount: actualQuestionCount,
                    language: quizConfig.language,
                    questions: {
                        create: questionsCreateData
                    }
                }
            });
        } catch (err) {
            console.error("Database insert error:", err);
            throw err;
        }

        console.info(`[EnginePipeline] Pipeline completed successfully for UploadData ID: ${uploadDataId}`);
        console.log("Quiz pipeline completed");

    } catch (error) {
        // Error handling: log error without crashing the server
        console.error(`[EnginePipeline] Critical error in quiz generation pipeline for UploadData ID: ${uploadDataId}`, error);
    }
}
