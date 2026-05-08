import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type ProductActivityAction = 'view' | 'click';

@Entity('product_activities')
export class ProductActivity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  customerId: string;

  @Column()
  productId: string;

  @Column()
  action: ProductActivityAction;

  @CreateDateColumn()
  createdAt: Date;
}
