import 'reflect-metadata';
import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { logger } from './app/logger';
import { connectDatabase } from './app/database';
import { createSocketServer } from './app/socket';
import { errorHandler, notFoundHandler } from './app/middlewares';
// Routes
import customerRouter from './app/features/authenticated/customer';
import addressRouter from './app/features/authenticated/address';
import cartRouter from './app/features/authenticated/cart';
import paymentRouter from './app/features/authenticated/payment';
import reviewRouter from './app/features/authenticated/review';
import favoriteRouter from './app/features/authenticated/favorite';
import vnpayRouter from './app/features/authenticated/vnpay';
import chatRouter from './app/features/authenticated/chat';
import adminOrderRouter from './app/features/admin/order';
import adminUserRouter from './app/features/admin/user';
import adminDashboardRouter from './app/features/admin/dashboard';
import adminCouponRouter from './app/features/admin/coupons';
import adminProductRouter from './app/features/admin/products';
import adminDiscountProgramRouter from './app/features/admin/discount-programs';
import categoryRouter from './app/features/guest/category';
import brandRouter from './app/features/guest/brand';
import productRouter from './app/features/guest/product';
import guestCouponRouter from './app/features/guest/coupon';
import guestDiscountProgramRouter from './app/features/guest/discount-programs';
import provinceRouter from './app/features/guest/province';
import wardRouter from './app/features/guest/ward';

const app: Application = express();
const httpServer = createServer(app);
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
app.use('/', favoriteRouter);
app.use('/', vnpayRouter);
app.use('/', chatRouter);
app.use('/', adminOrderRouter);
app.use('/', adminUserRouter);
app.use('/', adminDashboardRouter);
app.use('/', adminCouponRouter);
app.use('/', adminProductRouter);
app.use('/', adminDiscountProgramRouter);
app.use('/', categoryRouter);
app.use('/', brandRouter);
app.use('/', productRouter);
app.use('/', guestCouponRouter);
app.use('/', guestDiscountProgramRouter);
app.use('/', provinceRouter);
app.use('/', wardRouter);
app.use(notFoundHandler);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  errorHandler(err, res);
});

// Start server
const startServer = async (): Promise<void> => {
  await connectDatabase();
  createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

export default app;
