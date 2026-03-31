import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
    createConversation,
    getConversationMessages,
    listConversations,
    sendConversationMessage,
} from '../services/chat.service';

function mapConversationSummary(conversation: any) {
    return {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessage:
            Array.isArray(conversation.messages) && conversation.messages[0]
                ? {
                    id: conversation.messages[0].id,
                    content: conversation.messages[0].content,
                    role: conversation.messages[0].role,
                    createdAt: conversation.messages[0].createdAt,
                }
                : null,
        messageCount: conversation._count?.messages ?? 0,
    };
}

function mapMessage(message: any) {
    return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
    };
}

export async function createConversationController(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.auth?.userId;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        const conversation = await createConversation(userId);

        return res.status(201).json({
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
                lastMessage: null,
                messageCount: 0,
            },
        });
    } catch (error) {
        console.error('[ChatController] Failed to create conversation:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to create conversation.',
        });
    }
}

export async function listConversationsController(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.auth?.userId;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        const conversations = await listConversations(userId);

        return res.json({
            conversations: conversations.map(mapConversationSummary),
        });
    } catch (error) {
        console.error('[ChatController] Failed to fetch conversations:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch conversations.',
        });
    }
}

export async function getConversationMessagesController(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.auth?.userId;
        const conversationId = req.params.id;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        if (!conversationId) {
            return res.status(400).json({
                error: 'conversationId is required.',
            });
        }

        const conversation = await getConversationMessages(userId, conversationId);

        return res.json({
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            },
            messages: conversation.messages.map(mapMessage),
        });
    } catch (error) {
        const statusCode =
            typeof error === 'object' &&
            error !== null &&
            'statusCode' in error &&
            typeof (error as { statusCode?: unknown }).statusCode === 'number'
                ? (error as { statusCode: number }).statusCode
                : 500;

        console.error('[ChatController] Failed to fetch messages:', error);
        return res.status(statusCode).json({
            error: error instanceof Error ? error.message : 'Failed to fetch conversation.',
        });
    }
}

export async function sendMessageController(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.auth?.userId;
        const { conversationId, message } = req.body ?? {};

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized.',
            });
        }

        if (!conversationId || typeof conversationId !== 'string') {
            return res.status(400).json({
                error: 'conversationId is required.',
            });
        }

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'message is required.',
            });
        }

        const result = await sendConversationMessage(userId, conversationId, message);

        return res.json({
            success: true,
            conversation: {
                id: result.conversation.id,
                title: result.conversation.title,
                createdAt: result.conversation.createdAt,
                updatedAt: result.conversation.updatedAt,
                lastMessage: mapMessage(result.assistantMessage),
                messageCount: result.messageCount,
            },
            userMessage: mapMessage(result.userMessage),
            assistantMessage: mapMessage(result.assistantMessage),
        });
    } catch (error) {
        const statusCode =
            typeof error === 'object' &&
            error !== null &&
            'statusCode' in error &&
            typeof (error as { statusCode?: unknown }).statusCode === 'number'
                ? (error as { statusCode: number }).statusCode
                : 500;

        console.error('[ChatController] Failed to send message:', error);
        return res.status(statusCode).json({
            error: error instanceof Error ? error.message : 'Failed to send message.',
        });
    }
}
