import { Router, Request, Response, NextFunction } from 'express';
import { CreateOrderPayload, OrderService } from './OrderService';

const router = Router();
const orderService = new OrderService();

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
