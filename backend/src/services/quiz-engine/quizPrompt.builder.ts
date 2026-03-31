export function buildQuizPrompt(description: string, config: any): string {
    const { questionCount, language, difficulty, difficultyDistribution } = config;
    
    // Language wording
    const langInstructions = language === "en" 
        ? "English" 
        : "Bahasa Indonesia";

    let difficultyInstructions = `Ensure all questions match the difficulty level: **${difficulty.toUpperCase()}**. Allowed values: easy, medium, hard.`;
    
    if (difficulty === "random" && difficultyDistribution) {
        difficultyInstructions = `
Generate EXACTLY this difficulty distribution:
- ${difficultyDistribution.easy} easy questions
- ${difficultyDistribution.medium} medium questions
- ${difficultyDistribution.hard} hard questions
`;
    }

    return `
You are an expert educational content creator. Your task is to generate a diverse, engaging quiz based on the provided learning description.

### CONFIGURATION
- **Question Count**: Generate exactly ${questionCount} questions.
- **Language**: Translate all outputs (questionText, options, explanation) strictly to **${langInstructions}**.
- **Difficulty**: ${difficultyInstructions}

### REQUIREMENTS
1. Keep the questions strictly within the provided context/description.
2. Generate ONLY "multiple_choice" questions.
3. Every question MUST have exactly 4 options.
4. Exactly 1 option must have "isCorrect": true.
5. Provide a detailed explanation for the correct answer.

### JSON OUTPUT FORMAT
You MUST respond with valid JSON only. Do not wrap it in markdown codeblocks like \`\`\`json. Just output the raw JSON string starting with { and ending with }.

The output must exactly match this JSON schema:
{
    "questions": [
        {
            "type": "multiple_choice",
            "difficulty": "easy",
            "questionText": "What is ...?",
            "explanation": "Because ...",
            "options": [
                { "optionText": "Option A", "isCorrect": false },
                { "optionText": "Option B", "isCorrect": true },
                { "optionText": "Option C", "isCorrect": false },
                { "optionText": "Option D", "isCorrect": false }
            ]
        }
    ]
}

### CRITICAL RULES
- Total generated questions MUST be exactly: ${questionCount}.
- Use only these difficulty values: "easy", "medium", "hard".
- Every question MUST use "type": "multiple_choice".
- Every question MUST contain "questionText", "difficulty", "explanation", and "options".
- Every "options" array MUST contain exactly 4 option objects.
- Each option object MUST contain "optionText" and "isCorrect".
- Exactly one option per question must have "isCorrect": true.
- No empty fields. All text must be non-empty strings.
- Validate your JSON before finalizing. Output JSON ONLY.

### THE LEARNING DESCRIPTION
${description}
`;
}
