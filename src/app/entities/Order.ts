import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('orders')
export class Order {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  customerId: string;

  @Column()
  cartId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column()
  arrivalName: string;

  @Column()
  arrivalPhone: string;

  @Column()
  arrivalAddress: string;

  @Column({ nullable: true })
  arrivalTime?: Date;

  @Column({ nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
