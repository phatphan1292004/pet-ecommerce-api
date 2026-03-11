import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { logger } from '../logger';
import { Customer } from '../entities/Customer';
import { Category } from '../entities/Categories';

export const AppDataSource = new DataSource({
  type: 'mongodb',
  url: config.mongodb.uri,
  synchronize: false,
  logging: config.env !== 'production',
  entities: [Customer, Category],
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
