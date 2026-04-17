import { Router, Request, Response, NextFunction } from 'express';
import { GuestCouponService } from './CouponService';

const router = Router();
const guestCouponService = new GuestCouponService();

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

router.get('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string | undefined;
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const coupons = await guestCouponService.getAvailableCoupons({ code, page, limit });

    res.status(200).json({
      success: true,
      message: 'Available coupons fetched successfully',
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
