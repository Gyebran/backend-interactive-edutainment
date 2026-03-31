import { QuestionDifficulty, Quiz, QuestionType } from "./quizTypes";

const SUPPORTED_TYPES: QuestionType[] = ["multiple_choice"];
const SUPPORTED_DIFFICULTIES: QuestionDifficulty[] = ["easy", "medium", "hard"];
const DEFAULT_MIN_QUESTIONS = 8;

export function validateQuizOutput(data: unknown, expectedQuestionCount?: number): asserts data is Quiz {
    if (!data || typeof data !== "object") {
        throw new Error("Invalid output: Expected a JSON object.");
    }

    const quizData = data as any;

    if (!Array.isArray(quizData.questions)) {
        throw new Error("Invalid output: Expected 'questions' to be an array.");
    }

    const minimumQuestionCount =
        expectedQuestionCount !== undefined && Number.isInteger(expectedQuestionCount)
            ? Math.max(expectedQuestionCount, 1)
            : DEFAULT_MIN_QUESTIONS;

    if (quizData.questions.length < minimumQuestionCount) {
        throw new Error(`Invalid output: Expected at least ${minimumQuestionCount} questions, got ${quizData.questions.length}.`);
    }

    if (
        expectedQuestionCount !== undefined &&
        Number.isInteger(expectedQuestionCount) &&
        quizData.questions.length !== expectedQuestionCount
    ) {
        throw new Error(
            `Invalid output: Expected exactly ${expectedQuestionCount} questions, got ${quizData.questions.length}.`
        );
    }

    // Validate each question
    for (let i = 0; i < quizData.questions.length; i++) {
        const q = quizData.questions[i];

        if (!q.type || !SUPPORTED_TYPES.includes(q.type)) {
            throw new Error(`Invalid output: Question ${i + 1} has an invalid or missing 'type'. Supported types: ${SUPPORTED_TYPES.join(", ")}`);
        }
        if (!q.difficulty || !SUPPORTED_DIFFICULTIES.includes(q.difficulty)) {
            throw new Error(`Invalid output: Question ${i + 1} must use difficulty ${SUPPORTED_DIFFICULTIES.join(" | ")}.`);
        }
        if (!q.questionText || typeof q.questionText !== "string" || q.questionText.trim().length === 0) {
            throw new Error(`Invalid output: Question ${i + 1} is missing a valid 'questionText'.`);
        }
        if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim().length === 0) {
            throw new Error(`Invalid output: Question ${i + 1} is missing a valid 'explanation' text.`);
        }

        if (!Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Invalid output: Multiple choice question ${i + 1} must have exactly 4 options.`);
        }

        const correctOptionCount = q.options.filter((option: any) => option?.isCorrect === true).length;
        if (correctOptionCount !== 1) {
            throw new Error(`Invalid output: Question ${i + 1} must have exactly 1 correct option, got ${correctOptionCount}.`);
        }

        for (let optionIndex = 0; optionIndex < q.options.length; optionIndex++) {
            const option = q.options[optionIndex];
            if (!option || typeof option !== "object") {
                throw new Error(`Invalid output: Option ${optionIndex + 1} in question ${i + 1} must be an object.`);
            }
            if (!option.optionText || typeof option.optionText !== "string" || option.optionText.trim().length === 0) {
                throw new Error(`Invalid output: Option ${optionIndex + 1} in question ${i + 1} is missing a valid 'optionText'.`);
            }
            if (typeof option.isCorrect !== "boolean") {
                throw new Error(`Invalid output: Option ${optionIndex + 1} in question ${i + 1} must include boolean 'isCorrect'.`);
            }
        }
    }
}
