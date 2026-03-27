import { Router, Request, Response, NextFunction } from 'express';
import { CustomerService, SyncCustomerData, UpdateCustomerProfileData } from './CustomerService';

const router = Router();
const customerService = new CustomerService();

// GET /api/v1/customers/:firebaseUid - Get customer by Firebase UID
router.get('/customers/:firebaseUid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.params.firebaseUid as string;
    const customer = await customerService.getCustomerById(firebaseUid);
    res.json({ data: customer });
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

// PATCH /api/v1/customers/:firebaseUid - Update customer profile (including avatar URL)
router.patch('/customers/:firebaseUid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.params.firebaseUid as string;
    const { displayName, phoneNumber, photoURL, birthDate, gender } = req.body;

    const updateData: UpdateCustomerProfileData = {
      ...(displayName !== undefined && { displayName }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(photoURL !== undefined && { photoURL }),
      ...(birthDate !== undefined && { birthDate }),
      ...(gender !== undefined && { gender }),
    };

    const customer = await customerService.updateCustomerProfile(firebaseUid, updateData);

    res.status(200).json({
      message: 'Customer profile updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
