import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type DiscountProgramDiscountType = 'PERCENT' | 'FIXED';

@Entity('discount_programs')
export class DiscountProgram {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column()
  discountType: DiscountProgramDiscountType;

  @Column()
  discountValue: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: [] })
  productIds: ObjectId[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
