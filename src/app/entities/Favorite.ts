import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('favorites')
export class Favorite {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  customerId: string;

  @Column()
  products: ObjectId[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
