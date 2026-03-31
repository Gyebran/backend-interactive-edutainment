import { MessageRole } from '@prisma/client';
import { db } from '../database';
import { generateChatbotCompletion } from './chatbot';

function buildConversationTitle(content: string) {
    const normalized = content.trim().replace(/\s+/g, ' ');

    if (normalized.length <= 60) {
        return normalized;
    }

    return `${normalized.slice(0, 57)}...`;
}

async function getOwnedConversation(userId: string, conversationId: string) {
    const conversation = await db.conversation.findFirst({
        where: {
            id: conversationId,
            userId,
        },
    });

    if (!conversation) {
        const error = new Error('Conversation not found.');
        (error as Error & { statusCode?: number }).statusCode = 404;
        throw error;
    }

    return conversation;
}

export async function createConversation(userId: string) {
    return db.conversation.create({
        data: {
            userId,
        },
    });
}

export async function listConversations(userId: string) {
    return db.conversation.findMany({
        where: {
            userId,
        },
        orderBy: {
            updatedAt: 'desc',
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            },
            _count: {
                select: {
                    messages: true,
                },
            },
        },
    });
}

export async function getConversationMessages(userId: string, conversationId: string) {
    const conversation = await db.conversation.findFirst({
        where: {
            id: conversationId,
            userId,
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    });

    if (!conversation) {
        const error = new Error('Conversation not found.');
        (error as Error & { statusCode?: number }).statusCode = 404;
        throw error;
    }

    return conversation;
}

export async function sendConversationMessage(userId: string, conversationId: string, content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
        const error = new Error('Message cannot be empty.');
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
    }

    const conversation = await getOwnedConversation(userId, conversationId);

    const userMessage = await db.message.create({
        data: {
            conversationId,
            role: MessageRole.user,
            content: trimmedContent,
        },
    });

    const history = await db.message.findMany({
        where: {
            conversationId,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    let assistantContent = '';

    try {
        assistantContent = await generateChatbotCompletion(
            history.map((message) => ({
                role: message.role,
                content: message.content,
            }))
        );
    } catch (error) {
        console.error('[ChatService] Failed to generate assistant response:', error);
        assistantContent = 'Maaf, terjadi kesalahan saat menghubungi layanan AI.';
    }

    const assistantMessage = await db.message.create({
        data: {
            conversationId,
            role: MessageRole.assistant,
            content: assistantContent,
        },
    });

    const shouldUpdateTitle = !conversation.title || conversation.title === 'Percakapan Baru';

    const updatedConversation = await db.conversation.update({
        where: {
            id: conversationId,
        },
        data: {
            title: shouldUpdateTitle ? buildConversationTitle(trimmedContent) : conversation.title,
            updatedAt: new Date(),
        },
    });

    return {
        conversation: updatedConversation,
        userMessage,
        assistantMessage,
        messageCount: history.length + 1,
    };
}
