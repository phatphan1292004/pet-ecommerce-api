import { Server, Socket } from 'socket.io';
import { ChatService } from '../features/authenticated/chat/ChatService';
import { logger } from '../logger';

interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  senderName?: string;
  message?: string;
  messageType?: 'text' | 'image';
  imageUrl?: string;
  isRead?: boolean;
}

const chatService = new ChatService();

export const registerChatSocket = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join_conversation', (payload: JoinConversationPayload) => {
      if (!payload?.conversationId) {
        socket.emit('chat_error', { message: 'conversationId is required' });
        return;
      }

      socket.join(payload.conversationId);
      socket.emit('joined_conversation', { conversationId: payload.conversationId });
    });

    socket.on('send_message', async (payload: SendMessagePayload) => {
      try {
        const savedMessage = await chatService.createMessage(payload);
        io.to(payload.conversationId).emit('new_message', savedMessage);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to send message';
        socket.emit('chat_error', { message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};
