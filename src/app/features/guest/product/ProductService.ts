import { AppDataSource } from '@/app/database';
import { Category } from '@/app/entities/Categories';
import { Customer } from '@/app/entities/Customer';
import { Favorite } from '@/app/entities/Favorite';
import { Product } from '@/app/entities/Product';
import { ProductActivity, ProductActivityAction } from '@/app/entities/ProductActivity';
import { Cart } from '@/app/entities/Cart';
import { NotFoundError, BadRequestError } from '@/app/exceptions/AppError';
import { cosineSimilarity } from '@/app/utils/contentEmbedding';
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
  subcategoryId?: string;
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
  isFavorite: boolean;
  description: string;
  longDescription: string;
  images: string[];
  stock: number;
  shipping: string;
  is_active: boolean;
  specifications: any;
  benefits: any;
  usage?: string;
  ingredients?: string;
  created_at: Date;
}

export class ProductService {
  private repo = AppDataSource.getMongoRepository(Product);
  private categoryRepo = AppDataSource.getMongoRepository(Category);
  private customerRepo = AppDataSource.getMongoRepository(Customer);
  private favoriteRepo = AppDataSource.getMongoRepository(Favorite);
  private cartRepo = AppDataSource.getMongoRepository(Cart);
  private activityRepo = AppDataSource.getMongoRepository(ProductActivity);
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
   * Get most favorited products (popular)
   */
  async getPopularProducts(limit = 10): Promise<ProductResponse[]> {
    const pipeline = [
      { $unwind: '$products' },
      { $group: { _id: '$products', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $replaceRoot: { newRoot: '$product' } }
    ];

    const aggregateResult = await (this.favoriteRepo as any).aggregate(pipeline).toArray();

    if (!Array.isArray(aggregateResult) || aggregateResult.length === 0) {
      return [];
    }

    return aggregateResult.map((p: Product) => this.toProductResponse(p));
  }

  /**
   * Get best-selling products by summing quantities from non-open carts
   */
  async getBestSellingProducts(limit = 10): Promise<ProductResponse[]> {
    const pipeline = [
      { $match: { status: 'close', products: { $exists: true, $ne: [] } } },
      { $unwind: '$products' },
      { $group: { _id: '$products.productId', quantity: { $sum: '$products.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: limit }
    ];

    const aggregateResult = await (this.cartRepo as any).aggregate(pipeline).toArray() as Array<{ _id: string; quantity: number }>;

    const ids = (aggregateResult || [])
      .map((r) => (typeof r._id === 'string' ? r._id : String(r._id)))
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (ids.length === 0) {
      return [];
    }

    const products = await this.repo.find({
      where: { _id: { $in: ids }, is_active: true }
    });

    const productMap = new Map(products.map((p) => [p._id.toHexString(), p]));

    const ordered: Product[] = ids
      .map((oid) => productMap.get(oid.toHexString()))
      .filter((p): p is Product => !!p);

    return ordered.map(this.toProductResponse);
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
  async getProductBySlug(slug: string, customerId?: string): Promise<ProductDetailResponse> {
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
    const isFavorite = await this.isProductInFavorite(product._id, customerId);

    return this.toProductDetailResponse(product, brandName, isFavorite);
  }

  async trackProductActivity(
    customerId: string,
    productId: string,
    action: ProductActivityAction,
  ): Promise<void> {
    const normalizedCustomerId = customerId?.trim();
    if (!normalizedCustomerId) {
      throw new BadRequestError('customerId is required');
    }

    if (!ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid productId format');
    }

    if (action !== 'view' && action !== 'click') {
      throw new BadRequestError('action must be view or click');
    }

    const activity = this.activityRepo.create({
      customerId: normalizedCustomerId,
      productId: productId.trim(),
      action,
    });

    await this.activityRepo.save(activity);

    const trackedProduct = await this.repo.findOne({
      where: { _id: new ObjectId(productId), is_active: true },
    });

    if (!trackedProduct) {
      console.warn(`[trackProductActivity] Product not found: ${productId}`);
      return;
    }

    const embedding = trackedProduct.embedding ?? [];
    if (embedding.length === 0) {
      console.warn(`[trackProductActivity] No embedding for product: ${productId}`);
      return;
    }

    console.log(`[trackProductActivity] Updating profile for customer: ${normalizedCustomerId}, action: ${action}`);
    await this.updateCustomerProfileEmbedding(normalizedCustomerId, embedding, action === 'click' ? 2 : 1);
  }

  async getRecommendedProductsForCustomer(
    customerId: string,
    limit = 10,
    historyLimit = 20,
  ): Promise<ProductResponse[]> {
    const normalizedCustomerId = customerId?.trim();
    if (!normalizedCustomerId) {
      throw new BadRequestError('customerId is required');
    }

    const cappedHistory = Math.max(1, Math.min(historyLimit, 50));
    const cappedLimit = Math.max(1, Math.min(limit, 20));

    const customer = await this.customerRepo.findOne({
      where: { firebaseUid: normalizedCustomerId },
    });

    const storedProfileEmbedding = customer?.profileEmbedding ?? [];
    const hasStoredProfileEmbedding = storedProfileEmbedding.length > 0;

    const activities = await this.activityRepo.find({
      where: { customerId: normalizedCustomerId },
      order: { createdAt: 'DESC' },
      take: cappedHistory,
    });

    if (activities.length === 0) {
      return [];
    }

    const productWeights = new Map<string, number>();
    for (const activity of activities) {
      const weight = activity.action === 'click' ? 2 : 1;
      productWeights.set(
        activity.productId,
        (productWeights.get(activity.productId) ?? 0) + weight,
      );
    }

    const historyIds = [...productWeights.keys()].filter((id) => ObjectId.isValid(id));
    if (historyIds.length === 0) {
      return [];
    }

    const historyObjectIds = historyIds.map((id) => new ObjectId(id));
    const historyProducts = await this.repo.find({
      where: { _id: { $in: historyObjectIds }, is_active: true },
    });

    const historyEmbeddings = historyProducts
      .map((product) => {
        if (!product.embedding || product.embedding.length === 0) {
          return null;
        }

        const weight = productWeights.get(product._id.toHexString()) ?? 1;
        return { embedding: product.embedding, weight };
      })
      .filter((item): item is { embedding: number[]; weight: number } => !!item);

    const profileEmbedding = hasStoredProfileEmbedding
      ? storedProfileEmbedding
      : this.buildProfileEmbedding(historyEmbeddings);

    if (profileEmbedding.length === 0) {
      return [];
    }

    if (!hasStoredProfileEmbedding && historyEmbeddings.length > 0) {
      await this.persistCustomerProfileEmbedding(normalizedCustomerId, profileEmbedding, historyEmbeddings);
    }

    const historySubcategoryIds = [
      ...new Set(
        historyProducts
          .map((product) => product.subcategories?.toHexString?.())
          .filter((value): value is string => typeof value === 'string' && ObjectId.isValid(value)),
      ),
    ].map((value) => new ObjectId(value));

    const historySpecies = [
      ...new Set(historyProducts.map((product) => product.species).filter(Boolean)),
    ] as Array<Product['species']>;

    const historyTags = [
      ...new Set(
        historyProducts
          .flatMap((product) => product.tags ?? [])
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];

    let speciesFilter: Array<Product['species']> | null = null;
    if (historySpecies.length > 0 && !historySpecies.includes('both')) {
      if (historySpecies.includes('dog') && !historySpecies.includes('cat')) {
        speciesFilter = ['dog', 'both'];
      } else if (historySpecies.includes('cat') && !historySpecies.includes('dog')) {
        speciesFilter = ['cat', 'both'];
      }
    }

    const excludeIds = historyProducts.map((product) => product._id);
    const match: Record<string, unknown> = {
      _id: { $nin: excludeIds },
      is_active: true,
    };

    if (historySubcategoryIds.length > 0) {
      match.subcategories = { $in: historySubcategoryIds };
    }

    if (speciesFilter) {
      match.species = { $in: speciesFilter };
    }

    const candidates = await this.repo.find({ where: match, take: 400 });

    const scored = candidates
      .map((candidate) => {
        if (!candidate.embedding || candidate.embedding.length === 0) {
          return null;
        }

        return {
          product: candidate,
          score: this.scoreRecommendation(candidate, profileEmbedding, historyTags, historySubcategoryIds, historySpecies),
        };
      })
      .filter((item): item is { product: Product; score: number } => !!item && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, cappedLimit);

    return scored.map((item) => this.toProductResponse(item.product));
  }

  /**
   * Recommend products based on content similarity
   */
  async getRecommendedProducts(productId: string, limit = 10): Promise<ProductResponse[]> {
    if (!ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid productId format');
    }

    const baseProduct = await this.repo.findOne({
      where: { _id: new ObjectId(productId), is_active: true }
    });

    if (!baseProduct) {
      throw new NotFoundError('Product not found');
    }

    const baseEmbedding = baseProduct.embedding ?? [];
    if (baseEmbedding.length === 0) {
      return [];
    }

    const cappedLimit = Math.max(1, Math.min(limit, 20));
    const candidates = await this.repo.find({
      where: {
        _id: { $ne: baseProduct._id },
        is_active: true,
        subcategories: baseProduct.subcategories,
        ...(baseProduct.species === 'both'
          ? {}
          : { species: { $in: [baseProduct.species, 'both'] } }),
      },
      take: 500
    });

    const baseTags = (baseProduct.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
    const baseSubcategories = baseProduct.subcategories ? [baseProduct.subcategories] : [];
    const baseSpecies = baseProduct.species ? [baseProduct.species] : [];

    const scored = candidates
      .map((candidate) => {
        if (!candidate.embedding || candidate.embedding.length === 0) {
          return null;
        }

        const score = this.scoreRecommendation(candidate, baseEmbedding, baseTags, baseSubcategories, baseSpecies);
        return {
          product: candidate,
          score,
        };
      })
      .filter((item): item is { product: Product; score: number } => !!item && item.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, cappedLimit);

    return scored.map((item) => this.toProductResponse(item.product));
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

  /**
   * Search products by keyword (name / slug / description) with pagination and sorting
   */
  async searchProducts(
    q: string,
    page?: number,
    limit?: number,
    sortBy?: ProductFilterParams['sortBy']
  ): Promise<ProductFilterResult> {
    const keyword = q?.trim() ?? '';
    const pageNum = page && page > 0 ? Math.floor(page) : 1;
    const limitNum = limit && limit > 0 ? Math.min(Math.floor(limit), 60) : 12;
    const skip = (pageNum - 1) * limitNum;

    if (!keyword) {
      return this.filterProducts({ page: pageNum, limit: limitNum, sortBy });
    }

    const keywordRegex = new RegExp(this.escapeRegex(keyword), 'i');

    const match: Record<string, unknown> = {
      is_active: true,
      $or: [{ name: keywordRegex }, { slug: keywordRegex }, { description: keywordRegex }]
    };

    const sortStage = this.getSortStage(sortBy ?? 'latest');

    const pipeline = [
      { $match: match },
      {
        $facet: {
          items: [{ $sort: sortStage }, { $skip: skip }, { $limit: limitNum }],
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
      page: pageNum,
      limit: limitNum,
      totalPages: total > 0 ? Math.ceil(total / limitNum) : 0
    };
  }

  async searchProductsForChatbot(
    question: string,
    page?: number,
    limit?: number,
    sortBy?: ProductFilterParams['sortBy']
  ): Promise<ProductFilterResult> {
    const keyword = question?.trim() ?? '';
    const pageNum = page && page > 0 ? Math.floor(page) : 1;
    const limitNum = limit && limit > 0 ? Math.min(Math.floor(limit), 60) : 12;
    const skip = (pageNum - 1) * limitNum;

    const keywordTokens = this.extractSearchTokens(keyword);
    if (keywordTokens.length === 0) {
      return this.filterProducts({ page: pageNum, limit: limitNum, sortBy });
    }

    const match: Record<string, unknown> = {
      is_active: true,
      $and: this.buildTokenMatch(keywordTokens),
    };

    const sortStage = this.getSortStage(sortBy ?? 'latest');
    const pipeline = [
      { $match: match },
      {
        $facet: {
          items: [{ $sort: sortStage }, { $skip: skip }, { $limit: limitNum }],
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
      page: pageNum,
      limit: limitNum,
      totalPages: total > 0 ? Math.ceil(total / limitNum) : 0
    };
  }

  async searchProductsByEmbedding(queryEmbedding: number[], limit: number): Promise<ProductResponse[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 20));

    if (queryEmbedding.length === 0) {
      return [];
    }

    return this.searchProductsByCosine(queryEmbedding, safeLimit);
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
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      subcategoryId: product.subcategories?.toHexString?.()
    };
  }

  private async searchProductsByCosine(queryEmbedding: number[], limit: number): Promise<ProductResponse[]> {
    const products = await this.repo.find({ where: { is_active: true } });

    const scored = products
      .map((product) => {
        const embedding = product.embedding ?? [];
        if (embedding.length === 0) {
          return null;
        }

        return {
          product,
          score: cosineSimilarity(queryEmbedding, embedding),
        };
      })
      .filter((item): item is { product: Product; score: number } => !!item && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((item) => this.toProductResponse(item.product));
  }

  /**
   * Map Product entity to ProductDetailResponse
   */
  private toProductDetailResponse(product: Product, brandName: string, isFavorite: boolean): ProductDetailResponse {
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
      isFavorite,
      description: product.description,
      longDescription: product.longDescription,
      images: product.images || [],
      stock: product.stock,
      shipping: product.shipping,
      is_active: product.is_active,
      specifications: product.specifications,
      benefits: product.benefits,
      usage: product.usage,
      ingredients: product.ingredients,
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

  private extractSearchTokens(input: string): string[] {
    const normalized = input
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return [];
    }

    const stopWords = new Set([
      'tôi',
      'tìm',
      'muốn',
      'cần',
      'các',
      'cái',
      'những',
      'sản',
      'phẩm',
      'loại',
      'như',
      'thế',
      'này',
      'và',
      'là',
      'có',
      'không',
      'giúp',
      'với',
      'về',
      'từ',
      'ở',
      'trên',
      'dưới',
      'theo',
      'để',
      'vô',
      'đến',
      'một',
      'nhiều',
      'ít',
      'hay',
      'đã',
      'đang',
      'sẽ',
      'nữa',
    ]);

    return normalized
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .filter((token) => !stopWords.has(token));
  }

  private buildTokenMatch(tokens: string[]): Array<Record<string, unknown>> {
    return tokens.map((token) => {
      const regex = new RegExp(this.escapeRegex(token), 'i');
      return {
        $or: [{ name: regex }, { slug: regex }, { description: regex }],
      };
    });
  }

  private scoreRecommendation(
    candidate: Product,
    embedding: number[],
    tags: string[],
    subcategoryIds: Array<ObjectId | string>,
    species: Array<Product['species']>,
  ): number {
    const baseScore = cosineSimilarity(embedding, candidate.embedding ?? []);
    if (baseScore <= 0) {
      return 0;
    }

    let bonus = 0;

    if (candidate.subcategories && subcategoryIds.length > 0) {
      const candidateSubcategoryId = candidate.subcategories.toHexString();
      const hasSameSubcategory = subcategoryIds.some((id) =>
        id instanceof ObjectId ? id.toHexString() === candidateSubcategoryId : id === candidateSubcategoryId,
      );
      if (hasSameSubcategory) {
        bonus += 0.15;
      }
    }

    const candidateTags = (candidate.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
    if (tags.length > 0 && candidateTags.length > 0) {
      const tagHits = candidateTags.filter((tag) => tags.includes(tag)).length;
      if (tagHits > 0) {
        bonus += Math.min(0.25, tagHits * 0.03);
      }
    }

    if (candidate.species && species.length > 0) {
      if (species.includes('both') || candidate.species === 'both' || species.includes(candidate.species)) {
        bonus += 0.08;
      }
    }

    return baseScore * (1 + bonus);
  }

  private async isProductInFavorite(productId: ObjectId, customerId?: string): Promise<boolean> {
    const normalizedCustomerId = customerId?.trim();
    if (!normalizedCustomerId) {
      return false;
    }

    const favorite = await this.favoriteRepo.findOne({
      where: {
        customerId: normalizedCustomerId
      }
    });

    if (!favorite) {
      return false;
    }

    const legacyProductIds = (favorite as Favorite & { productIds?: unknown }).productIds;
    const normalizedProductIds = this.normalizeFavoriteProductIds(favorite.products ?? legacyProductIds);

    return normalizedProductIds.includes(productId.toHexString());
  }

  private normalizeFavoriteProductIds(values: unknown): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map((value) => {
        if (value instanceof ObjectId) {
          return value.toHexString();
        }

        if (typeof value === 'string') {
          const normalized = value.trim();
          return ObjectId.isValid(normalized) ? new ObjectId(normalized).toHexString() : null;
        }

        return null;
      })
      .filter((value): value is string => typeof value === 'string');
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

  private buildProfileEmbedding(
    embeddings: Array<{ embedding: number[]; weight: number }>,
  ): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    const length = embeddings[0].embedding.length;
    const combined = new Array(length).fill(0);
    let totalWeight = 0;

    for (const { embedding, weight } of embeddings) {
      for (let i = 0; i < length; i += 1) {
        combined[i] += (embedding[i] ?? 0) * weight;
      }
      totalWeight += weight;
    }

    if (!totalWeight) {
      return [];
    }

    for (let i = 0; i < length; i += 1) {
      combined[i] = combined[i] / totalWeight;
    }

    return this.normalizeVector(combined);
  }

  private async persistCustomerProfileEmbedding(
    customerId: string,
    embedding: number[],
    embeddings: Array<{ embedding: number[]; weight: number }>,
  ): Promise<void> {
    const customer = await this.customerRepo.findOne({
      where: { firebaseUid: customerId },
    });

    if (!customer) {
      return;
    }

    const totalWeight = embeddings.reduce((sum, item) => sum + item.weight, 0);
    customer.profileEmbedding = embedding;
    customer.profileEmbeddingWeight = totalWeight;

    await this.customerRepo.save(customer);
  }

  private async updateCustomerProfileEmbedding(
    customerId: string,
    embedding: number[],
    weight: number,
  ): Promise<void> {
    const customer = await this.customerRepo.findOne({
      where: { firebaseUid: customerId },
    });

    if (!customer) {
      console.warn(`[updateCustomerProfileEmbedding] Customer not found for firebaseUid: ${customerId}`);
      return;
    }

    console.log(`[updateCustomerProfileEmbedding] Found customer ${customer._id}, updating embedding`);

    const normalizedWeight = Math.max(1, weight);
    const existingEmbedding = customer.profileEmbedding ?? [];
    const existingWeight = customer.profileEmbeddingWeight ?? 0;

    if (existingEmbedding.length === 0 || existingWeight <= 0) {
      customer.profileEmbedding = this.normalizeVector(embedding);
      customer.profileEmbeddingWeight = normalizedWeight;
      await this.customerRepo.save(customer);
      console.log(`[updateCustomerProfileEmbedding] Saved initial embedding for customer ${customer._id}`);
      return;
    }

    const nextLength = Math.max(existingEmbedding.length, embedding.length);
    const combined = new Array(nextLength).fill(0);
    const totalWeight = existingWeight + normalizedWeight;

    for (let i = 0; i < nextLength; i += 1) {
      const currentValue = existingEmbedding[i] ?? 0;
      const incomingValue = embedding[i] ?? 0;
      combined[i] = ((currentValue * existingWeight) + (incomingValue * normalizedWeight)) / totalWeight;
    }

    customer.profileEmbedding = this.normalizeVector(combined);
    customer.profileEmbeddingWeight = totalWeight;

    await this.customerRepo.save(customer);
    console.log(`[updateCustomerProfileEmbedding] Updated embedding for customer ${customer._id}, totalWeight: ${totalWeight}`);
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (!norm) {
      return [];
    }

    return vector.map((value) => value / norm);
  }
}
