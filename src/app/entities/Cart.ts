import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export interface CartProduct {
  productId: string;
  quantity: number;
  price: number;
  name?: string;
  image?: string;
  slug?: string;
}

@Entity('carts')
export class Cart {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  customerId: string;

  @Column({ default: 'open' })
  status: string;

  @Column({ default: 0 })
  totalPrice: number;

  @Column({ default: 0 })
  totalDiscount: number;

  @Column({ default: 0 })
  finalPrice: number;

  @Column({ nullable: true })
  products: CartProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}