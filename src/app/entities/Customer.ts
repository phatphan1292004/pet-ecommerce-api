import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('customers')
export class Customer {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  firebaseUid: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  birthDate: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
