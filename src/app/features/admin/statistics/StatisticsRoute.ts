import { Router, Request, Response, NextFunction } from 'express';
import { AdminStatisticsService } from './StatisticsService';

const router = Router();
const adminStatisticsService = new AdminStatisticsService();

router.get('/admin/statistics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminStatisticsService.getStatistics();

    res.status(200).json({
      success: true,
      message: 'Statistics fetched successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
