import 'reflect-metadata';
import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { logger } from './app/logger';
import { connectDatabase } from './app/database';
// Routes
import customerRouter from './app/features/authenticated/customer';
import addressRouter from './app/features/authenticated/address';
import cartRouter from './app/features/authenticated/cart';
import paymentRouter from './app/features/authenticated/payment';
import reviewRouter from './app/features/authenticated/review';
import categoryRouter from './app/features/guest/category';
import brandRouter from './app/features/guest/brand';
import productRouter from './app/features/guest/product';
import provinceRouter from './app/features/guest/province';
import wardRouter from './app/features/guest/ward';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', customerRouter);
app.use('/', addressRouter);
app.use('/', cartRouter);
app.use('/', paymentRouter);
app.use('/', reviewRouter);
app.use('/', categoryRouter);
app.use('/', brandRouter);
app.use('/', productRouter);
app.use('/', provinceRouter);
app.use('/', wardRouter);

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
