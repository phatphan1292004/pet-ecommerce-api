import 'reflect-metadata';
import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { logger } from './app/logger';
import { connectDatabase } from './app/database';
// Routes
import customerRouter from './app/features/authenticated/customer';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', customerRouter);

// Start server
const startServer = async (): Promise<void> => {
  await connectDatabase();

  app.listen(PORT, () => {
    logger.info(`🚀 Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

export default app;
