import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { logger } from '../logger';
import { Customer } from '../entities/Customer';
import { Category } from '../entities/Categories';
import { Product } from '../entities/Product';
import { Province } from '../entities/Province';
import { Ward } from '../entities/Ward';
import { Address } from '../entities/Address';
import { Cart } from '../entities/Cart';
import { Order } from '../entities/Order';
import { Review } from '../entities/Review';
import { Brand } from '../entities/Brand';
import { Role } from '../entities/Role';
import { Coupon } from '../entities/Coupon';

export const AppDataSource = new DataSource({
  type: 'mongodb',
  url: config.mongodb.uri,
  synchronize: false,
  logging: config.env !== 'production',
  entities: [Customer, Category, Product, Province, Ward, Address, Cart, Order, Review, Brand, Role, Coupon],
});
  
export const connectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('MongoDB connected successfully via TypeORM');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};
