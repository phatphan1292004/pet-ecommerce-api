import { Router, Request, Response, NextFunction } from 'express';
import { ProductService } from './ProductService';

const router = Router();
const productService = new ProductService();

/**
 * GET /products/latest
 * Get 10 latest active products
 * NOTE: This route must be defined BEFORE :slug route to avoid conflicts
 */
router.get('/products/latest', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getLatestProducts();
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/:slug
 * Get product detail by slug
 */
router.get('/products/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    
    // Prevent matching /products/latest
    if (slug === 'latest') {
      return next();
    }

    const product = await productService.getProductBySlug(slug);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

export default router;
