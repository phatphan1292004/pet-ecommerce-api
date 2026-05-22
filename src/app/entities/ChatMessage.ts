import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('chat_messages')
export class ChatMessage {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  conversationId: string;

  @Column()
  senderId: string;

  @Column()
  message: string;

  @Column({ default: 'text' })
  messageType: 'text' | 'image';

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  senderName?: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
