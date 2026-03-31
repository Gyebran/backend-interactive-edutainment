import { Router, Request, Response } from 'express';
import { generateChatbotAnswer } from '../services/chatbot';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                allowed: false,
                message: "Pesan tidak valid."
            });
        }

        const result = await generateChatbotAnswer(message);
        res.json(result);
    } catch (error) {
        console.error("Chatbot Error:", error);
        res.status(500).json({
            allowed: false,
            message: "Terjadi kesalahan internal server."
        });
    }
});

export default router;
