import { Router, Request, Response, NextFunction } from 'express';
import { AddressService, CreateAddressData } from './AddressService';

const router = Router();
const addressService = new AddressService();

router.get('/addresses/:firebaseUid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.params.firebaseUid as string;
    const addresses = await addressService.getAddressesByFirebaseUid(firebaseUid);

    res.status(200).json({
      success: true,
      data: addresses,
      count: addresses.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/addresses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload: CreateAddressData = req.body;
    const address = await addressService.createAddress(payload);

    res.status(201).json({
      message: 'Address created successfully',
      data: address
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/addresses/:addressId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addressId = req.params.addressId as string;
    const firebaseUid = (req.body?.firebaseUid || req.query?.firebaseUid) as string;

    if (!firebaseUid) {
      res.status(400).json({ success: false, message: 'firebaseUid is required' });
    }

    await addressService.deleteAddress(addressId, firebaseUid);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;