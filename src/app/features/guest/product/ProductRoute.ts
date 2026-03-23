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
 * GET /products/subcategory/:subCategoryId
 * Get active products by subcategory ID
 * NOTE: This route must be defined BEFORE :slug route to avoid conflicts
 */
router.get('/products/subcategory/:subCategoryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subCategoryId = req.params.subCategoryId as string;
    const products = await productService.getProductsBySubCategoryId(subCategoryId);

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
 * GET /products/filter
 * Filter active products by multiple criteria
 * Example:
 * /products/filter?subcategoryIds=id1,id2&brandIds=id3,id4&origins=Vi%E1%BB%87t%20Nam,Ph%C3%A1p&minPrice=100000&maxPrice=800000&sortBy=priceAsc&page=1&limit=12
 */
router.get('/products/filter', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseCsvParam = (value: unknown): string[] => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return [];
      }

      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    };

    const parseNumber = (value: unknown): number | undefined => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined;
      }

      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : undefined;
    };

    const result = await productService.filterProducts({
      subCategoryIds: parseCsvParam(req.query.subcategoryIds),
      brandIds: parseCsvParam(req.query.brandIds),
      origins: parseCsvParam(req.query.origins),
      minPrice: parseNumber(req.query.minPrice),
      maxPrice: parseNumber(req.query.maxPrice),
      sortBy: typeof req.query.sortBy === 'string' ? (req.query.sortBy as any) : undefined,
      page: parseNumber(req.query.page),
      limit: parseNumber(req.query.limit),
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined
    });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
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
    
    // Prevent matching static routes
    if (slug === 'latest' || slug === 'filter') {
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
