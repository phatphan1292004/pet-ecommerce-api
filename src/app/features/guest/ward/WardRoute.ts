import { Router, Request, Response, NextFunction } from 'express';
import { WardService } from './WardService';

const router = Router();
const wardService = new WardService();

router.get('/provinces/:provinceId/wards', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provinceId = req.params.provinceId as string;
    const wards = await wardService.getWardsByProvinceId(provinceId);

    res.json({
      success: true,
      data: wards,
      count: wards.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;