import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('addresses')
export class Address {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  firebaseUid: string;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  address: string;

  @Column()
  province: string;

  @Column()
  ward: string;

  @Column()
  type: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}