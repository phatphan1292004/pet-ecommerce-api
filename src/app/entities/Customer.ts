import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('customers')
export class Customer {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  firebaseUid: string;

  @Column()
  displayName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  photoURL: string;

  @Column({ nullable: true })
  birthDate: string;

  @Column({ nullable: true })
  gender: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
