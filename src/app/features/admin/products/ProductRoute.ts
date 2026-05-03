import { Router, Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/app/exceptions/AppError';
import {
  AdminCreateProductPayload,
  AdminProductService,
  AdminUpdateProductPayload,
} from './ProductService';

const router = Router();
const adminProductService = new AdminProductService();

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

router.get('/admin/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const brandId = req.query.brandId as string | undefined;
    const subCategoryId = req.query.subCategoryId as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);
    const minPrice = toOptionalNumber(req.query.minPrice);
    const maxPrice = toOptionalNumber(req.query.maxPrice);

    const isActiveRaw = req.query.isActive;
    const isActive = toOptionalBoolean(isActiveRaw);

    if (isActiveRaw !== undefined && isActive === undefined) {
      throw new BadRequestError('isActive must be true/false or 1/0');
    }

    const products = await adminProductService.getProducts({
      search,
      brandId,
      subCategoryId,
      isActive,
      minPrice,
      maxPrice,
      sortBy: sortBy as any,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await adminProductService.getProductById(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

  router.post('/admin/products', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as AdminCreateProductPayload;
      const product = await adminProductService.createProduct(payload);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  });

router.put('/admin/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AdminUpdateProductPayload;
    const product = await adminProductService.updateProduct(req.params.id as string, payload);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminProductService.deleteProduct(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
