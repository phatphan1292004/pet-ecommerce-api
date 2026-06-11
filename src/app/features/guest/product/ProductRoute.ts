import { Router, Request, Response, NextFunction } from 'express';
import { ProductService } from './ProductService';

const router = Router();
const productService = new ProductService();

router.get('/products/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseNumber = (value: unknown): number | undefined => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined;
      }

      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : undefined;
    };

    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const page = parseNumber(req.query.page);
    const limit = parseNumber(req.query.limit);
    const sortBy = typeof req.query.sortBy === 'string' ? (req.query.sortBy as any) : undefined;

    const result = await productService.searchProducts(q, page, limit, sortBy);

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

router.get('/products/popular', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getPopularProducts();
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/best-selling', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getBestSellingProducts();
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
});

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
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      productType: typeof req.query.productType === 'string' ? req.query.productType : undefined
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

router.get('/products/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseNumber = (value: unknown): number | undefined => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined;
      }

      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : undefined;
    };

    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : '';
    const limit = parseNumber(req.query.limit) ?? 10;
    const historyLimit = parseNumber(req.query.historyLimit) ?? 20;

    const products = await productService.getRecommendedProductsForCustomer(
      customerId,
      limit,
      historyLimit,
    );

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/products/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, productId, action } = req.body as {
      customerId?: string;
      productId?: string;
      action?: 'view' | 'click';
    };

    await productService.trackProductActivity(customerId ?? '', productId ?? '', action ?? 'view');

    res.json({
      success: true,
      message: 'Activity tracked successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    
    // Prevent matching static routes
    if (slug === 'latest' || slug === 'filter' || slug === 'popular' || slug === 'best-selling') {
      return next();
    }

    const product = await productService.getProductBySlug(slug, customerId);

    if (customerId) {
      await productService.trackProductActivity(customerId, product._id.toHexString(), 'view');
    }
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

export default router;
