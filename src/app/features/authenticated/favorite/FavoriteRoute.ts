import { Router, Request, Response, NextFunction } from 'express';
import { AddFavoritePayload, FavoriteService } from './FavoriteService';

const router = Router();
const favoriteService = new FavoriteService();

router.get('/favorites/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.customerId as string;
    const favorites = await favoriteService.getFavoritesByCustomerId(customerId);

    res.status(200).json({
      success: true,
      message: 'Favorite list fetched successfully',
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/favorites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AddFavoritePayload;
    const favorites = await favoriteService.addFavorite(payload);

    res.status(200).json({
      success: true,
      message: 'Product added to favorite list successfully',
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
