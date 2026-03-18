import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('provinces')
export class Province {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  provinceId: number;

  @Column()
  provinceCode: string;

  @Column()
  name: string;

  @Column()
  countryId: number;
}