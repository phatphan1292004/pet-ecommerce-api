import { AppDataSource } from '@/app/database';
import { Brand } from '@/app/entities/Brand';
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
  productType?: string;
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
    const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 200) : 100;
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

    if (params.productType) {
      if (params.productType === 'popular') {
        const popularIds = await this.getPopularProductIds(200);
        match._id = { $in: popularIds };
      } else if (params.productType === 'best-selling' || params.productType === 'bestSelling') {
        const bestSellingIds = await this.getBestSellingProductIds(200);
        match._id = { $in: bestSellingIds };
      } else if (params.productType === 'new') {
        const latestProducts = await this.repo.find({
          where: { is_active: true },
          order: { created_at: 'DESC' },
          take: 100
        });
        const latestIds = latestProducts.map((p) => p._id);
        match._id = { $in: latestIds };
      }
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

    const tokens = this.extractSmartTokens(keyword);
    if (tokens.length === 0) {
      return this.filterProducts({ page: pageNum, limit: limitNum, sortBy });
    }

    // Load active products, active brands, and categories to match names/types/ids
    const [products, brands, categories] = await Promise.all([
      this.repo.find({ where: { is_active: true } }),
      AppDataSource.getMongoRepository(Brand).find({ where: { is_active: true } }),
      this.categoryRepo.find({ where: { is_active: true } }),
    ]);

    const brandMap = new Map<string, string>(); // lower-cased name -> brand id hex
    const brandIdToName = new Map<string, string>();
    for (const b of brands) {
      const name = b.name?.trim().toLowerCase();
      if (name) {
        brandMap.set(name, b._id.toHexString());
        brandIdToName.set(b._id.toHexString(), b.name);
      }
    }

    const subCategoryMap = new Map<string, string>(); // lower-cased subcategory name -> subcategory id hex
    const subCategoryIdToName = new Map<string, string>();
    for (const cat of categories) {
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const name = sub.name?.trim().toLowerCase();
          if (name) {
            subCategoryMap.set(name, sub._id.toHexString());
            subCategoryIdToName.set(sub._id.toHexString(), sub.name);
          }
        }
      }
    }

    const questionLower = keyword.toLowerCase();

    // 1. Detect species
    let detectedSpecies: 'dog' | 'cat' | null = null;
    const dogKeywords = ['chó', 'cún', 'dog', 'puppy', 'poodle', 'phốc sóc', 'alaska', 'husky', 'pug', 'golden', 'becgie', 'cún con', 'chó con', 'chó lớn', 'chó trưởng thành'];
    const catKeywords = ['mèo', 'miu', 'cat', 'kitten', 'whiskas', 'catty', 'nekko', 'mèo con', 'mèo lớn', 'mèo trưởng thành'];
    
    const hasDog = dogKeywords.some(kw => questionLower.includes(kw));
    const hasCat = catKeywords.some(kw => questionLower.includes(kw));
    if (hasDog && !hasCat) {
      detectedSpecies = 'dog';
    } else if (hasCat && !hasDog) {
      detectedSpecies = 'cat';
    }

    // 2. Detect brands
    const detectedBrandIds: string[] = [];
    for (const [brandName, brandId] of brandMap.entries()) {
      if (questionLower.includes(brandName)) {
        detectedBrandIds.push(brandId);
      }
    }

    // 3. Detect subcategories (product type)
    const detectedSubCategoryIds: string[] = [];
    for (const [subName, subId] of subCategoryMap.entries()) {
      if (questionLower.includes(subName)) {
        detectedSubCategoryIds.push(subId);
      }
    }
    // Check general terms/synonyms
    if (questionLower.includes('hạt') || questionLower.includes('thức ăn khô') || questionLower.includes('kibble')) {
      for (const [subName, subId] of subCategoryMap.entries()) {
        if (subName.includes('hạt') || subName.includes('khô')) {
          detectedSubCategoryIds.push(subId);
        }
      }
    }
    if (questionLower.includes('pate') || questionLower.includes('thức ăn ướt') || questionLower.includes('gravy') || questionLower.includes('lon') || questionLower.includes('xốt') || questionLower.includes('sốt')) {
      for (const [subName, subId] of subCategoryMap.entries()) {
        if (subName.includes('pate') || subName.includes('sốt') || subName.includes('xốt') || subName.includes('lon')) {
          detectedSubCategoryIds.push(subId);
        }
      }
    }
    if (questionLower.includes('cát') || questionLower.includes('vệ sinh')) {
      for (const [subName, subId] of subCategoryMap.entries()) {
        if (subName.includes('cát') || subName.includes('vệ sinh')) {
          detectedSubCategoryIds.push(subId);
        }
      }
    }
    if (questionLower.includes('sữa tắm') || questionLower.includes('tắm') || questionLower.includes('dầu gội')) {
      for (const [subName, subId] of subCategoryMap.entries()) {
        if (subName.includes('tắm') || subName.includes('gội') || subName.includes('shampoo') || subName.includes('mượt lông')) {
          detectedSubCategoryIds.push(subId);
        }
      }
    }
    if (questionLower.includes('bánh thưởng') || questionLower.includes('snack') || questionLower.includes('que gặm') || questionLower.includes('xương gặm') || questionLower.includes('súp thưởng')) {
      for (const [subName, subId] of subCategoryMap.entries()) {
        if (subName.includes('thưởng') || subName.includes('snack') || subName.includes('gặm') || subName.includes('xương')) {
          detectedSubCategoryIds.push(subId);
        }
      }
    }

    // 4. Detect lifestage (age/size)
    let detectedLifestage: 'young' | 'adult' | null = null;
    const youngKeywords = [
      'con', 'nhỏ', 'baby', 'puppy', 'kitten', 'tập ăn', 
      'dưới 1 tuổi', 'dưới một tuổi', 'sơ sinh', 'mới đẻ', 'mới sinh',
      'tháng tuổi', 'tháng', 'bầu', 'thai'
    ];
    const adultKeywords = [
      'lớn', 'trưởng thành', 'adult', 'già', 'senior', 'lớn tuổi', 
      '1 tuổi', '2 tuổi', '3 tuổi', '4 tuổi', '5 tuổi', '6 tuổi', '7 tuổi', '8 tuổi', '9 tuổi', '10 tuổi',
      'một tuổi', 'hai tuổi', 'ba tuổi', 'bốn tuổi', 'năm tuổi'
    ];
    
    const hasYoung = youngKeywords.some(kw => questionLower.includes(kw));
    const hasAdult = adultKeywords.some(kw => questionLower.includes(kw));
    if (hasYoung && !hasAdult) {
      detectedLifestage = 'young';
    } else if (hasAdult && !hasYoung) {
      detectedLifestage = 'adult';
    }

    const scoredProducts = products.map((product) => {
      let score = 0;

      const productName = product.name?.toLowerCase() ?? '';
      const productDesc = product.description?.toLowerCase() ?? '';
      const productLongDesc = product.longDescription?.toLowerCase() ?? '';
      const productTags = (product.tags ?? []).map(t => t.toLowerCase().trim());
      const productBrandId = product.brand instanceof ObjectId ? product.brand.toHexString() : String(product.brand);
      const productSubCatId = product.subcategories instanceof ObjectId ? product.subcategories.toHexString() : String(product.subcategories);
      const productSpecies = product.species ?? 'both';

      // 1. Species Match
      if (detectedSpecies) {
        if (productSpecies === detectedSpecies) {
          score += 15;
        } else if (productSpecies === 'both') {
          score += 5;
        } else {
          score -= 30; // heavy mismatch penalty
        }
      }

      // 2. Brand Match
      if (detectedBrandIds.length > 0) {
        if (detectedBrandIds.includes(productBrandId)) {
          score += 25;
        }
      }

      // 3. Subcategory Match
      if (detectedSubCategoryIds.length > 0) {
        if (detectedSubCategoryIds.includes(productSubCatId)) {
          score += 20;
        }
      }

      // 4. Lifestage Match
      if (detectedLifestage) {
        const isYoungProduct = productTags.some(t => 
          t.includes('con') || t.includes('nhỏ') || t.includes('puppy') || t.includes('kitten') || t.includes('tập ăn') || t.includes('dưới 12 tháng') || t.includes('dưới 1 tuổi')
        ) || productName.includes('con') || productName.includes('nhỏ') || productName.includes('puppy') || productName.includes('kitten') || productName.includes('mini');

        const isAdultProduct = productTags.some(t => 
          t.includes('lớn') || t.includes('trưởng thành') || t.includes('adult') || t.includes('già') || t.includes('senior')
        ) || productName.includes('lớn') || productName.includes('trưởng thành') || productName.includes('adult') || productName.includes('già') || productName.includes('senior');

        if (detectedLifestage === 'young') {
          if (isYoungProduct) {
            score += 20;
          }
          if (isAdultProduct) {
            score -= 15;
          }
        } else if (detectedLifestage === 'adult') {
          if (isAdultProduct) {
            score += 20;
          }
          if (isYoungProduct) {
            score -= 15;
          }
        }
      }

      // 5. Token match
      let matchedTokensCount = 0;
      for (const token of tokens) {
        // Tag match (very high priority)
        const matchedTag = productTags.some(tag => tag === token || tag.includes(token) || token.includes(tag));
        if (matchedTag) {
          score += 10;
          matchedTokensCount++;
        }

        // Name match
        if (productName.includes(token)) {
          score += 6;
          matchedTokensCount++;
        }

        // Subcategory name match
        const subName = subCategoryIdToName.get(productSubCatId)?.toLowerCase() ?? '';
        if (subName && (subName.includes(token) || token.includes(subName))) {
          score += 4;
          matchedTokensCount++;
        }

        // Brand name match
        const bName = brandIdToName.get(productBrandId)?.toLowerCase() ?? '';
        if (bName && (bName.includes(token) || token.includes(bName))) {
          score += 4;
          matchedTokensCount++;
        }

        // Description match
        if (productDesc.includes(token) || productLongDesc.includes(token)) {
          score += 2;
          matchedTokensCount++;
        }
      }

      if (tokens.length > 0 && matchedTokensCount === 0) {
        score -= 10;
      }

      return {
        product,
        score,
      };
    });

    const filtered = scoredProducts
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        // Secondary sort if scores are identical
        const aTime = a.product.created_at ? new Date(a.product.created_at).getTime() : 0;
        const bTime = b.product.created_at ? new Date(b.product.created_at).getTime() : 0;

        switch (sortBy) {
          case 'priceAsc':
            return a.product.price - b.product.price || bTime - aTime;
          case 'priceDesc':
            return b.product.price - a.product.price || bTime - aTime;
          case 'discountDesc':
            return b.product.discount - a.product.discount || bTime - aTime;
          case 'reviewDesc':
            return b.product.review - a.product.review || bTime - aTime;
          default:
            return bTime - aTime;
        }
      });

    const paginated = filtered.slice(skip, skip + limitNum);
    const total = filtered.length;

    return {
      items: paginated.map((item) => this.toProductResponse(item.product)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: total > 0 ? Math.ceil(total / limitNum) : 0,
    };
  }

  private extractSmartTokens(input: string): string[] {
    const normalized = input
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return [];
    }

    const stopWords = new Set([
      'tôi', 'tìm', 'muốn', 'cần', 'các', 'cái', 'những', 'sản', 'phẩm', 'loại', 'như', 'thế', 'này', 
      'và', 'là', 'có', 'không', 'giúp', 'với', 'về', 'từ', 'ở', 'trên', 'dưới', 'theo', 'để', 'vô', 
      'đến', 'một', 'nhiều', 'ít', 'hay', 'đã', 'đang', 'sẽ', 'nữa', 'của', 'cho', 'nên', 'nào', 'tốt', 'nhất'
    ]);

    return normalized
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .filter((token) => !stopWords.has(token));
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
      .filter((item): item is { product: Product; score: number } => !!item && item.score >= 0.5)
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

  private async getPopularProductIds(limit = 100): Promise<ObjectId[]> {
    const pipeline = [
      { $unwind: '$products' },
      { $group: { _id: '$products', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ];

    const aggregateResult = await (this.favoriteRepo as any).aggregate(pipeline).toArray();
    if (!Array.isArray(aggregateResult) || aggregateResult.length === 0) {
      return [];
    }

    return aggregateResult
      .map((r) => {
        try {
          return typeof r._id === 'string' ? new ObjectId(r._id) : r._id;
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id instanceof ObjectId);
  }

  private async getBestSellingProductIds(limit = 100): Promise<ObjectId[]> {
    const pipeline = [
      { $match: { status: 'close', products: { $exists: true, $ne: [] } } },
      { $unwind: '$products' },
      { $group: { _id: '$products.productId', quantity: { $sum: '$products.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: limit }
    ];

    const aggregateResult = await (this.cartRepo as any).aggregate(pipeline).toArray();
    if (!Array.isArray(aggregateResult) || aggregateResult.length === 0) {
      return [];
    }

    return aggregateResult
      .map((r) => {
        try {
          const idStr = typeof r._id === 'string' ? r._id : String(r._id);
          return ObjectId.isValid(idStr) ? new ObjectId(idStr) : null;
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id instanceof ObjectId);
  }
}
