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

export interface ConversationListItem {
  conversationId: string;
  lastMessage: string;
  lastMessageType: 'text' | 'image';
  lastImageUrl: string | null;
  lastMessageAt: Date;
  lastSenderId: string;
  lastSenderName: string | null;
  unreadCount: number;
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

  async getConversations(limit: number = 50, readerId?: string): Promise<ConversationListItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const unreadCond = readerId
      ? {
          $and: [
            { $eq: ['$isRead', false] },
            { $ne: ['$senderId', readerId] }
          ]
        }
      : { $eq: ['$isRead', false] };

    const cursor = this.repo.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          conversationId: { $first: '$conversationId' },
          lastMessage: { $first: '$message' },
          lastMessageType: { $first: '$messageType' },
          lastImageUrl: { $first: '$imageUrl' },
          lastMessageAt: { $first: '$createdAt' },
          lastSenderId: { $first: '$senderId' },
          lastSenderName: { $first: '$senderName' },
          unreadCount: {
            $sum: {
              $cond: [unreadCond, 1, 0],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $limit: safeLimit },
    ]);

    const items = await cursor.toArray();
    return items.map((item) => ({
      conversationId: String(item.conversationId ?? item._id),
      lastMessage: item.lastMessage ?? '',
      lastMessageType: item.lastMessageType ?? 'text',
      lastImageUrl: item.lastImageUrl ?? null,
      lastMessageAt: item.lastMessageAt,
      lastSenderId: item.lastSenderId,
      lastSenderName: item.lastSenderName ?? null,
      unreadCount: item.unreadCount ?? 0,
    }));
  }

  async markAsRead(conversationId: string, readerId: string): Promise<boolean> {
    if (!conversationId || !readerId) {
      throw new BadRequestError('conversationId and readerId are required');
    }

    await this.repo.updateMany(
      { conversationId, senderId: { $ne: readerId }, isRead: false },
      { $set: { isRead: true } }
    );
    return true;
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
