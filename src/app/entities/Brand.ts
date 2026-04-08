import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('brands')
export class Brand {
	@ObjectIdColumn()
	_id: ObjectId;

	@Column()
	name: string;

	@Column({ unique: true })
	slug: string;

	@Column()
	icon: string;

	@Column({ default: true })
	is_active: boolean;

	@CreateDateColumn({ name: 'created_at' })
	created_at: Date;
}
