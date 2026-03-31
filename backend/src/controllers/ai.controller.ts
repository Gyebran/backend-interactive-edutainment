import { Request, Response } from 'express';
import { maia } from '../database';
import { RAGEngine } from '../engine/ragEngine';

export const generateContent = async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const result = await maia.generateContent(prompt);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const analyzePdf = async (req: Request, res: Response) => {
    try {
        // In a real app with file upload middleware, file path would be in req.file.path
        // Here we accept it from body for testing or existing path
        const filePath = req.body.filePath;
        const userId = req.body.userId || "user-default-001"; // Fallback/Test ID

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const engine = new RAGEngine();
        const result = await engine.processAndSavePdf(filePath, userId);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("PDF Analysis Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
