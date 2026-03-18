import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('wards')
export class Ward {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  wardId: string;

  @Column()
  wardCode: string;

  @Column()
  name: string;

  @Column()
  provinceId: number;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}