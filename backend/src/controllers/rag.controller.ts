import { Request, Response } from 'express';
import { RAGEngine } from '../engine/ragEngine';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getDocumentSummary = async (req: Request, res: Response) => {
    try {
        console.log("Initialize RAG Engine for request...");
        const engine = new RAGEngine();
        await engine.initialize();

        console.log("Generating summary...");
        const summary = await engine.generateSummary();

        res.json({
            success: true,
            summary: summary
        });
    } catch (error) {
        console.error("RAG Error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }

};

export const processPdfUpload = async (req: AuthenticatedRequest, res: Response) => {
    let tempFilePath: string | null = null;
    try {
        const { pdfBase64, difficulty, questionCount, language } = req.body;
        const userId = req.auth?.userId;

        if (!pdfBase64 || !userId) {
            return res.status(400).json({ error: 'pdfBase64 is required' });
        }

        console.log(`[RAGController] Received PDF upload request for User: ${userId}`);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Decode Base64 and write to temp file
        const buffer = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ""), 'base64');
        const filename = `upload-${Date.now()}.pdf`;
        tempFilePath = path.join(tempDir, filename);

        fs.writeFileSync(tempFilePath, buffer);
        console.log(`[RAGController] PDF saved to temp file: ${tempFilePath}`);

        // Initialize RAG Engine
        const engine = new RAGEngine();
        // await engine.initialize(); // Not strictly needed for processAndSavePdf as it acts on single file

        const config = {
            difficulty: difficulty || "random",
            questionCount: questionCount ? parseInt(questionCount, 10) : 10,
            language: language || "id"
        };

        // Process PDF
        const result = await engine.processAndSavePdf(tempFilePath, userId, config);

        res.json({
            success: true,
            data: {
                id: result.record.id,
                url: result.record.cloudinaryUrl,
                analysis: result.analysis
            }
        });

    } catch (error) {
        console.error('[RAGController] Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    } finally {
        // Cleanup temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
                console.log(`[RAGController] Cleaned up temp file: ${tempFilePath}`);
            } catch (cleanupError) {
                console.error('[RAGController] Failed to cleanup temp file:', cleanupError);
            }
        }
    }
};

export const triggerBatchProcess = async (req: Request, res: Response) => {
    try {
        console.log("Triggering batch process for assets...");
        const engine = new RAGEngine();

        // Use a background job approach or await? 
        // For simplicity, we await it, but for large datasets this should be backgrounded.
        // User request implies they want to see it done.

        const results = await engine.batchProcessAssets("system-batch-runner");

        res.json({
            success: true,
            results: results
        });
    } catch (error) {
        console.error("Batch Process Error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
