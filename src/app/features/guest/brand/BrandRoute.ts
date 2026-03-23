import { Router, Request, Response, NextFunction } from 'express';
import { BrandService } from './BrandService';

const router = Router();
const brandService = new BrandService();

router.get('/brands', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await brandService.getAllBrands();

    res.json({
      success: true,
      data: brands,
      count: brands.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;