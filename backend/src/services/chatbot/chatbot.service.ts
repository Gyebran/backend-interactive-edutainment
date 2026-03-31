import { maia } from "../../database";

interface ChatbotResponse {
    allowed: boolean;
    answer?: string;
    message?: string;
}

export type ChatHistoryInput = {
    role: 'user' | 'assistant';
    content: string;
};

const CHATBOT_SYSTEM_PROMPT = `You are a helpful AI assistant.

You can answer any type of question, including:
- academic topics
- general knowledge
- casual questions

Rules:
- Be clear and helpful
- Keep answers concise
- Use appropriate language (Indonesian if user uses Indonesian)
- Do not produce harmful or unsafe content`;

export async function generateChatbotCompletion(history: ChatHistoryInput[]): Promise<string> {
    if (!Array.isArray(history) || history.length === 0) {
        throw new Error('Chat history cannot be empty.');
    }

    const messages = [
        {
            role: 'system' as const,
            content: CHATBOT_SYSTEM_PROMPT,
        },
        ...history.map((message) => ({
            role: message.role,
            content: message.content,
        })),
    ];

    return maia.generateChat(messages);
}

export async function generateChatbotAnswer(question: string): Promise<ChatbotResponse> {
    try {
        const responseText = await generateChatbotCompletion([
            {
                role: 'user',
                content: question,
            },
        ]);

        return {
            allowed: true,
            answer: responseText
        };
    } catch (error) {
        console.error("Error generating chatbot answer:", error);
        return {
            allowed: false,
            message: "Terjadi kesalahan saat menghubungi layanan AI."
        };
    }
}
