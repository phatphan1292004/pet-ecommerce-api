import { Router, Request, Response, NextFunction } from 'express';
import { AdminDashboardService } from './DashboardService';

const router = Router();
const adminDashboardService = new AdminDashboardService();

router.get('/admin/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await adminDashboardService.getDashboard();

    res.status(200).json({
      success: true,
      message: 'Dashboard fetched successfully',
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
