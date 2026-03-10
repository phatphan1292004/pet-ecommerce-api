import { Router, Request, Response, NextFunction } from 'express';
import { CustomerService, SyncCustomerData } from './CustomerService';

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

// POST /api/v1/customers - Sync customer from frontend
router.post('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firebaseUid, email, displayName, phone } = req.body;

    // Validate required fields
    if (!firebaseUid || !email || !displayName) {
      res.status(400).json({
        error: 'Missing required fields: firebaseUid, email, displayName'
      });
      return;
    }

    const userData: SyncCustomerData = {
      firebaseUid,
      email,
      displayName,
      phone,
    };

    const customer = await customerService.syncCustomer(userData);
    
    res.status(200).json({
      message: 'Customer synced successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
});

export default router;
