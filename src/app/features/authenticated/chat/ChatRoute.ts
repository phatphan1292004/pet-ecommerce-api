import { Router, Request, Response, NextFunction } from 'express';
import { ChatService } from './ChatService';

const router = Router();
const chatService = new ChatService();

router.get('/chat/conversations/:conversationId/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = String(req.params.conversationId);
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const messages = await chatService.getConversationMessages(conversationId, limit);

    res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = await chatService.createMessage(req.body);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
