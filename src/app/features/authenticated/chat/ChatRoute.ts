import { Router, Request, Response, NextFunction } from 'express';
import { ChatService } from './ChatService';
import { ChatRagService } from './ChatRagService';
import { getIo } from '../../../socket';

const router = Router();
const chatService = new ChatService();
const chatRagService = new ChatRagService();

router.get('/chat/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const readerId = req.query.readerId ? String(req.query.readerId) : undefined;
    const conversations = await chatService.getConversations(limit, readerId);

    res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully',
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/conversations/:conversationId/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = String(req.params.conversationId);
    const { readerId } = req.body;
    await chatService.markAsRead(conversationId, readerId);

    const io = getIo();
    if (io) {
      io.to(conversationId).emit('messages_read', { conversationId, readerId });
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read successfully',
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
