import { Router, Request, Response, NextFunction } from 'express';
import {
  AdminCreateOrderPayload,
  AdminOrderService,
  AdminUpdateOrderPayload,
} from './OrderService';

const router = Router();
const adminOrderService = new AdminOrderService();

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

router.get('/admin/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const paymentMethod = req.query.paymentMethod as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const orders = await adminOrderService.getOrders({
      status,
      paymentMethod,
      customerId,
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

router.get('/admin/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await adminOrderService.getOrderById(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Order fetched successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminCreateOrderPayload;
    const order = await adminOrderService.createOrder(payload);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminUpdateOrderPayload;
    const order = await adminOrderService.updateOrder(req.params.id as string, payload);

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminOrderService.deleteOrder(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
