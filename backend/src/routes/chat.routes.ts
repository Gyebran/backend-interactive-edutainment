import { Router } from 'express';
import {
    createConversationController,
    getConversationMessagesController,
    listConversationsController,
    sendMessageController,
} from '../controllers/chat.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateRequest);

router.post('/conversation', createConversationController);
router.post('/message', sendMessageController);
router.get('/conversations', listConversationsController);
router.get('/:id', getConversationMessagesController);

export default router;
