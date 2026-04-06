import { Router, Request, Response, NextFunction } from 'express';
import { CreateOrderPayload, OrderService } from './OrderService';

const router = Router();
const orderService = new OrderService();

router.get('/orders/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const status = req.query.status as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const orders = await orderService.getOrdersByCustomer(customerId, {
      status,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as CreateOrderPayload;
    const order = await orderService.createOrder(payload);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
