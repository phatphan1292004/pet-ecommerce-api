import { Router, Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/app/exceptions/AppError';
import {
  AdminDiscountProgramService,
  AdminCreateDiscountProgramPayload,
  AdminUpdateDiscountProgramPayload,
} from './DiscountProgramService';

const router = Router();
const adminDiscountProgramService = new AdminDiscountProgramService();

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

router.get('/admin/discount-programs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const discountType = req.query.discountType as string | undefined;
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const isActiveRaw = req.query.isActive;
    const isActive = toOptionalBoolean(isActiveRaw);

    if (isActiveRaw !== undefined && isActive === undefined) {
      throw new BadRequestError('isActive must be true/false or 1/0');
    }

    const programs = await adminDiscountProgramService.getPrograms({
      search,
      discountType,
      isActive,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Discount programs fetched successfully',
      data: programs,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/discount-programs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const program = await adminDiscountProgramService.getProgramById(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Discount program fetched successfully',
      data: program,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/discount-programs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminCreateDiscountProgramPayload;
    const program = await adminDiscountProgramService.createProgram(payload);

    res.status(201).json({
      success: true,
      message: 'Discount program created successfully',
      data: program,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/discount-programs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminUpdateDiscountProgramPayload;
    const program = await adminDiscountProgramService.updateProgram(req.params.id as string, payload);

    res.status(200).json({
      success: true,
      message: 'Discount program updated successfully',
      data: program,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/discount-programs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminDiscountProgramService.deleteProgram(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Discount program deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/discount-programs/:id/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);

    const result = await adminDiscountProgramService.getProgramProducts(req.params.id as string, page, limit);

    res.status(200).json({
      success: true,
      message: 'Discount program products fetched successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/discount-programs/:id/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body as { productIds?: string[] };
    const program = await adminDiscountProgramService.addProducts(req.params.id as string, productIds ?? []);

    res.status(200).json({
      success: true,
      message: 'Products added to discount program successfully',
      data: program,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/discount-programs/:id/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body as { productIds?: string[] };
    const program = await adminDiscountProgramService.removeProducts(req.params.id as string, productIds ?? []);

    res.status(200).json({
      success: true,
      message: 'Products removed from discount program successfully',
      data: program,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
