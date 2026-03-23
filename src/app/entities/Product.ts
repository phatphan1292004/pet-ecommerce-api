import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('products')
export class Product {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  brand: ObjectId;

  @Column()
  subcategories: ObjectId;

  @Column()
  price: number;

  @Column()
  originalPrice: number;

  @Column()
  discount: number;

  @Column()
  description: string;

  @Column()
  longDescription: string;

  @Column({ type: 'simple-json' })
  specifications: {
    productName: string;
    brand: string;
    weight: string;
    type: string;
    purpose: string;
    origin: string;
  };

  @Column({ type: 'simple-json' })
  benefits: {
    healthSupport: string;
    nutritionNeeds: string;
    fatSupport: string;
    packaging: string;
  };

  @Column()
  stock: number;

  @Column()
  shipping: string;

  @Column('text', { array: true })
  images: string[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  review: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
