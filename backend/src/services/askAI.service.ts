import { maia } from '@/database';

type AskAIResult = {
    explanation: string;
};

type AskAIContext = 'quiz_review' | 'general';

function buildPrompt(text: string, _context: AskAIContext) {
    return `You are an educational assistant.

Explain the following term or phrase in a general and clear way.

Text:
${text}

Rules:
- DO NOT answer as if this is a test question
- DO NOT say 'jawaban yang benar adalah'
- Focus on explaining the concept or meaning
- Answer in Indonesian
- Keep it simple and clear
- Max 120 words
- If the text is short, expand it into a clear explanation

Examples:

Input: 'danau kuno'
Output: explanation of what ancient lakes are

Input: 'mitokondria'
Output: explanation of mitochondria function`;
}

export async function explainSelectedText(text: string, context: AskAIContext = 'general'): Promise<AskAIResult> {
    const normalizedText = text.trim();

    if (!normalizedText) {
        throw new Error('Teks yang dipilih tidak boleh kosong.');
    }

    const prompt = buildPrompt(normalizedText, context);

    const explanation = await maia.generateContent(prompt);

    return {
        explanation: explanation.trim(),
    };
}
