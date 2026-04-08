import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('reviews')
export class Review {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  productId: ObjectId;

  @Column()
  customerId: string;

  @Column()
  rating: number;

  @Column()
  level: number;

  @Column({ nullable: true })
  parentId?: ObjectId;

  @Column()
  comment: string;

  @Column('text', { array: true })
  images: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
