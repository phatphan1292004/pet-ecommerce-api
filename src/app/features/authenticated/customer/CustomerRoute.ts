import { Router, Request, Response, NextFunction } from 'express';
import { CustomerService } from './CustomerService';

const router = Router();
const customerService = new CustomerService();

// GET /api/v1/customers
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.json({ data: customers });
  } catch (error) {
    next(error);
  }
});

export default router;
