import { Request, Response, Router } from 'express';
import { explainSelectedText } from '../services/askAI.service';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { text, context } = req.body;

        if (typeof text !== 'string' || text.trim().length <= 1) {
            return res.status(400).json({
                message: 'Teks yang dipilih harus lebih dari 1 karakter.',
            });
        }

        const askAIContext = context === 'quiz_review' ? 'quiz_review' : 'general';
        const result = await explainSelectedText(text, askAIContext);

        return res.json(result);
    } catch (error) {
        console.error('Ask AI error:', error);

        return res.status(500).json({
            message: 'Terjadi kesalahan saat meminta penjelasan AI.',
        });
    }
});

export default router;
