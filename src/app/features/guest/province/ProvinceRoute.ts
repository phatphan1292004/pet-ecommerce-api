import { Router, Request, Response, NextFunction } from 'express';
import { ProvinceService } from './ProvinceService';

const router = Router();
const provinceService = new ProvinceService();

router.get('/provinces', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const provinces = await provinceService.getAllProvinces();
    res.json({
      success: true,
      data: provinces,
      count: provinces.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;