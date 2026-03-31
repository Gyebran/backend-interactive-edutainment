import { Response } from 'express';
import { handleImageUpload, updateAiContent } from "../database";
import { contentEngine } from '../engine/content.engine';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function buildImageAiFallback(error: unknown, difficulty: unknown, questionCount: unknown, language: unknown) {
    return {
        description: 'AI processing failed',
        summary: 'AI processing failed',
        error: true,
        fallback: true,
        analyzedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
        quizConfig: {
            difficulty: difficulty || 'random',
            questionCount: questionCount ? parseInt(String(questionCount), 10) : 10,
            language: language || 'id',
        },
    };
}

export const analyzeImageUpload = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { imageBase64, difficulty, questionCount, language } = req.body;
        const userId = req.auth?.userId;

        if (!imageBase64 || !userId) {
            return res.status(400).json({ error: 'imageBase64 is required' });
        }

        console.log(`[UploadController] Received upload request for User: ${userId}`);

        // 1. Upload to Cloudinary (and create initial DB record)
        // We pass the Base64 string directly; Cloudinary handles it.
        const record = await handleImageUpload(imageBase64, userId);

        if (!record || !record.cloudinaryUrl) {
            throw new Error('Failed to upload image to storage.');
        }

        console.log(`[UploadController] Image stored at: ${record.cloudinaryUrl}`);

        let description = '';
        let aiContent: Record<string, unknown>;

        try {
            // 2. Analyze with AI (Content Engine)
            console.log('[UploadController] Starting AI Analysis...');
            description = await contentEngine.extractDescription(record.cloudinaryUrl);
            console.log('AI Response:', description);

            // 3. Update DB Record with Analysis
            aiContent = {
                description,
                summary: description,
                analyzedAt: new Date().toISOString(),
                quizConfig: {
                    difficulty: difficulty || 'random',
                    questionCount: questionCount ? parseInt(String(questionCount), 10) : 10,
                    language: language || 'id',
                },
            };
        } catch (aiError) {
            console.error('[UploadController] AI analysis failed:', aiError);
            aiContent = buildImageAiFallback(aiError, difficulty, questionCount, language);
            description = String(aiContent.description);
        }

        await updateAiContent(record.id, aiContent);

        // 4. Return Result
        return res.json({
            success: true,
            data: {
                id: record.id,
                url: record.cloudinaryUrl,
                description: description
            }
        });

    } catch (error) {
        console.error('[UploadController] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal Server Error',
        });
    }
};
