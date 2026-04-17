import { Router, Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/app/exceptions/AppError';
import {
  AdminCouponService,
  AdminCreateCouponPayload,
  AdminUpdateCouponPayload,
} from './CouponService';

const router = Router();
const adminCouponService = new AdminCouponService();

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  return undefined;
};

router.get('/admin/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string | undefined;
    const discountType = req.query.discountType as string | undefined;
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const isActiveRaw = req.query.isActive;
    const isActive = toOptionalBoolean(isActiveRaw);

    if (isActiveRaw !== undefined && isActive === undefined) {
      throw new BadRequestError('isActive must be true/false or 1/0');
    }

    const coupons = await adminCouponService.getCoupons({
      code,
      discountType,
      isActive,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Coupons fetched successfully',
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await adminCouponService.getCouponById(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Coupon fetched successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminCreateCouponPayload;
    const coupon = await adminCouponService.createCoupon(payload);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminUpdateCouponPayload;
    const coupon = await adminCouponService.updateCoupon(req.params.id as string, payload);

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminCouponService.deleteCoupon(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;