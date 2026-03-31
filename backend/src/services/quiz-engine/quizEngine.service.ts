import { maia } from "../../database";
import { buildQuizPrompt } from "./quizPrompt.builder";
import { validateQuizOutput } from "./quizValidator";
import { Question, QuestionDifficulty, QuestionType, Quiz } from "./quizTypes";

/**
 * Calls Gemini, parses JSON, and returns it.
 * Cleans up markdown if present.
 */
async function callGemini(prompt: string): Promise<unknown> {
    const responseText = await maia.generateContent(prompt);
    console.log(`[QuizEngine] Raw AI response length: ${responseText.length}`);

    // Attempt to parse JSON safely, sometimes AI wraps it in markdown code blocks
    let cleanJsonStr = responseText.trim();
    if (cleanJsonStr.startsWith("\`\`\`json")) {
        cleanJsonStr = cleanJsonStr.substring(7);
        if (cleanJsonStr.endsWith("\`\`\`")) {
            cleanJsonStr = cleanJsonStr.slice(0, -3);
        }
    } else if (cleanJsonStr.startsWith("\`\`\`")) {
        cleanJsonStr = cleanJsonStr.substring(3);
        if (cleanJsonStr.endsWith("\`\`\`")) {
            cleanJsonStr = cleanJsonStr.slice(0, -3);
        }
    }

    try {
        return JSON.parse(cleanJsonStr.trim());
    } catch (e: any) {
        console.error('[QuizEngine] AI JSON parse failed:', responseText);
        return {
            summary: responseText,
            fallback: true,
        };
    }
}

function normalizeQuestionType(value: unknown): QuestionType {
    const normalized = typeof value === "string"
        ? value.trim().toLowerCase().replace(/[\s-]+/g, "_")
        : "";

    return normalized === "multiple_choice" ? "multiple_choice" : "multiple_choice";
}

function normalizeQuestionDifficulty(value: unknown): QuestionDifficulty {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

    switch (normalized) {
        case "easy":
        case "beginner":
            return "easy";
        case "medium":
        case "intermediate":
            return "medium";
        case "hard":
        case "advanced":
            return "hard";
        default:
            return "medium";
    }
}

function normalizeQuizOutput(rawData: unknown, expectedQuestionCount?: number): Quiz {
    const rawQuestions = Array.isArray((rawData as any)?.questions) ? (rawData as any).questions : [];
    const seenQuestions = new Set<string>();
    const normalizedQuestions: Question[] = [];

    for (const rawQuestion of rawQuestions) {
        if (!rawQuestion || typeof rawQuestion !== "object") {
            continue;
        }

        const questionText =
            typeof rawQuestion.questionText === "string" ? rawQuestion.questionText.trim() : "";

        if (!questionText) {
            continue;
        }

        const dedupeKey = questionText.toLowerCase();
        if (seenQuestions.has(dedupeKey)) {
            console.warn(`[QuizEngine] Duplicate question removed during normalization: ${questionText}`);
            continue;
        }
        seenQuestions.add(dedupeKey);

        const explanation =
            typeof rawQuestion.explanation === "string" ? rawQuestion.explanation.trim() : "";

        const options = Array.isArray(rawQuestion.options)
            ? rawQuestion.options
                .filter((option: any) => option && typeof option === "object")
                .map((option: any) => ({
                    optionText: typeof option.optionText === "string" ? option.optionText.trim() : "",
                    isCorrect: Boolean(option.isCorrect),
                }))
            : [];

        normalizedQuestions.push({
            type: normalizeQuestionType(rawQuestion.type),
            difficulty: normalizeQuestionDifficulty(rawQuestion.difficulty),
            questionText,
            explanation,
            options,
        });
    }

    if (
        expectedQuestionCount !== undefined &&
        Number.isInteger(expectedQuestionCount) &&
        normalizedQuestions.length > expectedQuestionCount
    ) {
        console.warn(
            `[QuizEngine] AI returned ${normalizedQuestions.length} questions. Trimming to requested count ${expectedQuestionCount}.`
        );
        return {
            questions: normalizedQuestions.slice(0, expectedQuestionCount),
        };
    }

    return {
        questions: normalizedQuestions,
    };
}

/**
 * Main function to generate a quiz from a learning description.
 * Ensures the system retries once on failure (validation/parsing error).
 */
export async function generateQuizFromDescription(description: string, config: any, maxRetries = 1): Promise<Quiz> {
    if (!description || description.trim() === "") {
        throw new Error("Analysis engine error: Learning description cannot be empty.");
    }

    // Limit length if required to prevent overload
    const safeDescription = description.substring(0, 5000);

    const prompt = buildQuizPrompt(safeDescription, config);

    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            console.log(`[QuizEngine] Generating quiz... Attempt ${attempt + 1}`);

            const rawData = await callGemini(prompt);
            console.log("[QuizEngine] Generated quiz:", JSON.stringify(rawData));

            const normalizedQuiz = normalizeQuizOutput(rawData, config?.questionCount);
            console.log(`[QuizEngine] Question count after normalization: ${normalizedQuiz.questions.length}`);

            // This will throw if validation fails
            validateQuizOutput(normalizedQuiz, config?.questionCount);

            console.log(`[QuizEngine] Successfully generated and validated ${normalizedQuiz.questions.length} questions.`);
            return normalizedQuiz;
        } catch (error: any) {
            console.warn(`[QuizEngine] Generate attempt ${attempt + 1} failed: ${error.message}`);
            attempt++;
            if (attempt > maxRetries) {
                throw new Error(`[QuizEngine] Failed to generate valid quiz after ${maxRetries + 1} attempts. Last error: ${error.message}`);
            }
        }
    }

    throw new Error("[QuizEngine] Unexpected exit from generation loop.");
}
