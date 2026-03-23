import { AppDataSource } from '@/app/database';
import { Category } from '@/app/entities/Categories';
import { Product } from '@/app/entities/Product';
import { NotFoundError, BadRequestError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface ProductResponse {
  _id: ObjectId;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  discount: number;
  review: number;
  image: string;
}

export interface ProductFilterParams {
  subCategoryIds?: string[];
  brandIds?: string[];
  origins?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'latest' | 'priceAsc' | 'priceDesc' | 'discountDesc' | 'reviewDesc';
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface ProductFilterResult {
  items: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductDetailResponse extends ProductResponse {
  brand: string;
  description: string;
  longDescription: string;
  images: string[];
  stock: number;
  shipping: string;
  is_active: boolean;
  specifications: any;
  benefits: any;
  created_at: Date;
}

export class ProductService {
  private repo = AppDataSource.getMongoRepository(Product);
  private categoryRepo = AppDataSource.getMongoRepository(Category);
  private brandNameByIdCache: Map<string, string> | null = null;
  private brandCacheExpiresAt = 0;
  private readonly brandCacheTtlMs = 5 * 60 * 1000;

  /**
   * Get 10 latest active products
   */
  async getLatestProducts(): Promise<ProductResponse[]> {
    const products = await this.repo.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
      take: 10
    });

    return products.map(this.toProductResponse);
  }

  /**
   * Get active products by subcategory ID
   */
  async getProductsBySubCategoryId(subCategoryId: string): Promise<ProductResponse[]> {
    if (!ObjectId.isValid(subCategoryId)) {
      throw new BadRequestError('Invalid subCategory ID format');
    }

    const products = await this.repo.find({
      where: {
        subcategories: new ObjectId(subCategoryId),
        is_active: true
      },
      order: { created_at: 'DESC' }
    });

    return products.map(this.toProductResponse);
  }

  /**
   * Get product detail by slug
   */
  async getProductBySlug(slug: string): Promise<ProductDetailResponse> {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestError('Slug cannot be empty');
    }

    const product = await this.repo.findOne({
      where: { slug: slug, is_active: true }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const brandName = await this.findBrandNameById(product.brand);

    return this.toProductDetailResponse(product, brandName);
  }

  /**
   * Filter products by multiple criteria
   */
  async filterProducts(params: ProductFilterParams): Promise<ProductFilterResult> {
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 60) : 12;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {
      is_active: true
    };

    const subCategoryObjectIds = this.toObjectIds(params.subCategoryIds, 'subcategoryIds');
    if (subCategoryObjectIds.length > 0) {
      match.subcategories = { $in: subCategoryObjectIds };
    }

    const brandObjectIds = this.toObjectIds(params.brandIds, 'brandIds');
    if (brandObjectIds.length > 0) {
      match.brand = { $in: brandObjectIds };
    }

    if (typeof params.minPrice === 'number' || typeof params.maxPrice === 'number') {
      const priceFilter: Record<string, number> = {};

      if (typeof params.minPrice === 'number') {
        priceFilter.$gte = params.minPrice;
      }
      if (typeof params.maxPrice === 'number') {
        priceFilter.$lte = params.maxPrice;
      }
      if (
        typeof params.minPrice === 'number' &&
        typeof params.maxPrice === 'number' &&
        params.minPrice > params.maxPrice
      ) {
        throw new BadRequestError('minPrice cannot be greater than maxPrice');
      }

      match.price = priceFilter;
    }

    const originValues = (params.origins ?? []).map((origin) => origin.trim()).filter(Boolean);
    if (originValues.length > 0) {
      match['specifications.origin'] = { $in: originValues };
    }

    if (params.keyword && params.keyword.trim()) {
      const keywordRegex = new RegExp(this.escapeRegex(params.keyword.trim()), 'i');
      match.$or = [{ name: keywordRegex }, { slug: keywordRegex }, { description: keywordRegex }];
    }

    const sortBy = params.sortBy ?? 'latest';
    const sortStage = this.getSortStage(sortBy);

    const pipeline = [
      { $match: match },
      {
        $facet: {
          items: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const aggregateResult = (await this.repo.aggregate(pipeline).toArray()) as Array<{
      items: Product[];
      total: Array<{ count: number }>;
    }>;

    const firstResult = aggregateResult[0] ?? { items: [], total: [] };
    const total = firstResult.total[0]?.count ?? 0;

    return {
      items: firstResult.items.map(this.toProductResponse),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0
    };
  }

  // Helper methods

  /**
   * Map Product entity to ProductResponse
   */
  private toProductResponse(product: Product): ProductResponse {
    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      review: product.review,
      image: product.images && product.images.length > 0 ? product.images[0] : ''
    };
  }

  /**
   * Map Product entity to ProductDetailResponse
   */
  private toProductDetailResponse(product: Product, brandName: string): ProductDetailResponse {
    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      review: product.review,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      brand: brandName,
      description: product.description,
      longDescription: product.longDescription,
      images: product.images || [],
      stock: product.stock,
      shipping: product.shipping,
      is_active: product.is_active,
      specifications: product.specifications,
      benefits: product.benefits,
      created_at: product.created_at
    };
  }

  private getSortStage(sortBy: ProductFilterParams['sortBy']): Record<string, 1 | -1> {
    switch (sortBy) {
      case 'priceAsc':
        return { price: 1, created_at: -1 };
      case 'priceDesc':
        return { price: -1, created_at: -1 };
      case 'discountDesc':
        return { discount: -1, created_at: -1 };
      case 'reviewDesc':
        return { review: -1, created_at: -1 };
      default:
        return { created_at: -1 };
    }
  }

  private toObjectIds(values: string[] | undefined, fieldName: string): ObjectId[] {
    if (!values || values.length === 0) {
      return [];
    }

    return values.map((value) => {
      const trimmedValue = value.trim();
      if (!ObjectId.isValid(trimmedValue)) {
        throw new BadRequestError(`Invalid ${fieldName} value: ${trimmedValue}`);
      }

      return new ObjectId(trimmedValue);
    });
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async findBrandNameById(brandId: ObjectId): Promise<string> {
    await this.ensureBrandCache();

    return this.brandNameByIdCache?.get(brandId.toHexString()) ?? brandId.toHexString();
  }

  private async ensureBrandCache(): Promise<void> {
    const now = Date.now();
    if (this.brandNameByIdCache && now < this.brandCacheExpiresAt) {
      return;
    }

    const brandCategory = await this.categoryRepo.findOne({
      where: {
        slug: 'nhan-hang',
        is_active: true
      }
    });

    const cache = new Map<string, string>();
    if (brandCategory?.subcategories?.length) {
      for (const subcategory of brandCategory.subcategories) {
        if (subcategory.is_active) {
          cache.set(subcategory._id.toHexString(), subcategory.name);
        }
      }
    }

    this.brandNameByIdCache = cache;
    this.brandCacheExpiresAt = now + this.brandCacheTtlMs;
  }
}
