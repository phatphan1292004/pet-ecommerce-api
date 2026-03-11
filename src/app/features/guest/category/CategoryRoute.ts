import { Router, Request, Response, NextFunction } from 'express';
import { CategoryService } from './CategoryService';

const router = Router();
const categoryService = new CategoryService();

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

router.get('/categories/:id/subcategories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id as string;
    const subcategories = await categoryService.getSubcategoriesByCategoryId(categoryId);
    res.json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    next(error);
  }
});

export default router;
