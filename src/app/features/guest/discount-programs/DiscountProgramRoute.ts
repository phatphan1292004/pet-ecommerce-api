import { Router, Request, Response, NextFunction } from 'express';
import { GuestDiscountProgramService } from './DiscountProgramService';

const router = Router();
const guestDiscountProgramService = new GuestDiscountProgramService();

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};


router.get('/discount-programs/with-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const result = await guestDiscountProgramService.getActiveProgramWithProducts(page, limit);

    res.status(200).json({
      success: true,
      message: 'Discount program with products fetched successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
