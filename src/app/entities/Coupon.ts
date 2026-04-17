import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

export type CouponDiscountType = 'PERCENT' | 'FIXED';

@Entity('coupons')
export class Coupon {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  code: string;

  @Column()
  discountType: CouponDiscountType;

  @Column()
  discountValue: number;

  @Column({ default: 0 })
  minOrderValue: number;

  @Column({ nullable: true })
  maxDiscount?: number;

  @Column({ nullable: true })
  usageLimit?: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}