import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('categories')
export class Category {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  icon: string;

  @Column()
  level: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column(() => SubCategory)
  subcategories: SubCategory[];
}

export class SubCategory {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  icon: string;

  @Column({ default: true })
  is_active: boolean;
}
