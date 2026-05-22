import { ObjectId } from 'mongodb';
import { BadRequestError } from '../../../exceptions/AppError';
import { AppDataSource } from '../../../database';
import { ChatMessage } from '../../../entities/ChatMessage';

export interface CreateChatMessagePayload {
  conversationId: string;
  senderId: string;
  senderName?: string;
  message?: string;
  messageType?: 'text' | 'image';
  imageUrl?: string;
  isRead?: boolean;
}

export interface ChatMessageResponse {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  message: string;
  messageType: 'text' | 'image';
  imageUrl: string | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatService {
  private repo = AppDataSource.getMongoRepository(ChatMessage);

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<ChatMessageResponse[]> {
    if (!conversationId) {
      throw new BadRequestError('conversationId is required');
    }

    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const messages = await this.repo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: safeLimit,
    });

    return messages.map((message) => this.toResponse(message));
  }

  async createMessage(payload: CreateChatMessagePayload): Promise<ChatMessageResponse> {
    if (!payload.conversationId || !payload.senderId) {
      throw new BadRequestError('conversationId and senderId are required');
    }

    const messageType = payload.messageType ?? 'text';
    if (messageType !== 'text' && messageType !== 'image') {
      throw new BadRequestError('messageType must be text or image');
    }

    const sanitizedMessage = payload.message?.trim() ?? '';
    if (messageType === 'text' && !sanitizedMessage) {
      throw new BadRequestError('message cannot be empty');
    }

    const imageUrl = payload.imageUrl?.trim() ?? '';
    if (messageType === 'image' && !imageUrl) {
      throw new BadRequestError('imageUrl is required for image messages');
    }

    const chatMessage = this.repo.create({
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      senderName: payload.senderName,
      message: sanitizedMessage,
      messageType,
      imageUrl: imageUrl || undefined,
      isRead: payload.isRead ?? false,
    });

    const saved = await this.repo.save(chatMessage);
    return this.toResponse(saved);
  }

  private toResponse(chatMessage: ChatMessage): ChatMessageResponse {
    return {
      _id: chatMessage._id instanceof ObjectId ? chatMessage._id.toHexString() : String(chatMessage._id),
      conversationId: chatMessage.conversationId,
      senderId: chatMessage.senderId,
      senderName: chatMessage.senderName ?? null,
      message: chatMessage.message,
      messageType: chatMessage.messageType ?? 'text',
      imageUrl: chatMessage.imageUrl ?? null,
      isRead: chatMessage.isRead ?? false,
      createdAt: chatMessage.createdAt,
      updatedAt: chatMessage.updatedAt,
    };
  }
}
