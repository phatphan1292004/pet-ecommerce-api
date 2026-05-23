import { Router, Request, Response, NextFunction } from 'express';
import { ChatService } from './ChatService';
import { ChatRagService } from './ChatRagService';

const router = Router();
const chatService = new ChatService();
const chatRagService = new ChatRagService();

router.get('/chat/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const conversations = await chatService.getConversations(limit);

    res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully',
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
});

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

router.post('/chat/rag', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, limit, productLimit, includeProducts } = req.body as {
      question?: string;
      limit?: number;
      productLimit?: number;
      includeProducts?: boolean;
    };

    const answer = await chatRagService.askQuestion({
      question: question ?? '',
      limit,
      productLimit,
      includeProducts,
    });

    res.status(200).json({
      success: true,
      message: 'RAG response generated successfully',
      data: answer,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
