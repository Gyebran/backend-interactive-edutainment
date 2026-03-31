export type QuestionType = "multiple_choice";
export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuestionOption {
    optionText: string;
    isCorrect: boolean;
}

export interface Question {
    type: "multiple_choice";
    difficulty: QuestionDifficulty;
    questionText: string;
    explanation: string;
    options: QuestionOption[];
}

export interface Quiz {
    questions: Question[];
}
