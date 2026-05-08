import { AppDataSource } from '@/app/database';
import { Brand } from '@/app/entities/Brand';
import { Category } from '@/app/entities/Categories';
import { Product } from '@/app/entities/Product';
import { BadRequestError, ConflictError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

type NumberInput = number | string;

type SortByOption = 'latest' | 'priceAsc' | 'priceDesc' | 'discountDesc' | 'reviewDesc';

export interface AdminProductListQuery {
  search?: string;
  brandId?: string;
  subCategoryId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SortByOption;
  page?: number;
  limit?: number;
}

export interface AdminCreateProductPayload {
  name: string;
  slug: string;
  brandId: string;
  subCategoryId: string;
  price: NumberInput;
  originalPrice: NumberInput;
  discount?: NumberInput;
  description: string;
  longDescription: string;
  specifications: Product['specifications'];
  benefits: Product['benefits'];
  usage: string;
  ingredients: string;
  stock: NumberInput;
  shipping: string;
  images: string[] | string;
  isActive?: boolean;
  review?: NumberInput;
}

export interface AdminUpdateProductPayload {
  name?: string;
  slug?: string;
  brandId?: string;
  subCategoryId?: string;
  price?: NumberInput;
  originalPrice?: NumberInput;
  discount?: NumberInput;
  description?: string;
  longDescription?: string;
  specifications?: Product['specifications'];
  benefits?: Product['benefits'];
  usage?: string;
  ingredients?: string;
  stock?: NumberInput;
  shipping?: string;
  images?: string[] | string;
  isActive?: boolean;
  review?: NumberInput;
}

export interface AdminProductResponse {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  brandName?: string;
  subCategoryId: string;
  subCategoryName?: string;
  price: number;
  originalPrice: number;
  discount: number;
  review: number;
  description: string;
  longDescription: string;
  specifications: Product['specifications'];
  benefits: Product['benefits'];
  usage: string;
  ingredients: string;
  stock: number;
  shipping: string;
  images: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface AdminProductListResponse {
  items: AdminProductResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class AdminProductService {
  private productRepo = AppDataSource.getMongoRepository(Product);
  private brandRepo = AppDataSource.getMongoRepository(Brand);
  private categoryRepo = AppDataSource.getMongoRepository(Category);

  async getProducts(query: AdminProductListQuery = {}): Promise<AdminProductListResponse> {
    const where: Record<string, unknown> = {};

    if (query.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    if (query.brandId?.trim()) {
      where.brand = this.parseObjectId(query.brandId, 'brandId');
    }

    if (query.subCategoryId?.trim()) {
      where.subcategories = this.parseObjectId(query.subCategoryId, 'subCategoryId');
    }

    const minPrice = typeof query.minPrice === 'number' ? query.minPrice : undefined;
    const maxPrice = typeof query.maxPrice === 'number' ? query.maxPrice : undefined;

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestError('minPrice cannot be greater than maxPrice');
    }

    const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
    const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 10;
    const limit = Math.min(limitRaw, 50);

    const products = await this.productRepo.find({ where });

    const normalizedSearch = query.search?.trim().toLowerCase();
    const filteredProducts = normalizedSearch
      ? products.filter((product) =>
          [product.name, product.slug, product.description]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch)),
        )
      : products;

    const priceFiltered = filteredProducts.filter((product) => {
      if (minPrice !== undefined && product.price < minPrice) {
        return false;
      }

      if (maxPrice !== undefined && product.price > maxPrice) {
        return false;
      }

      return true;
    });

    const sortedProducts = priceFiltered.sort((a, b) => this.compareProducts(a, b, query.sortBy));

    const totalItems = sortedProducts.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const pagedProducts = sortedProducts.slice(startIndex, startIndex + limit);

    const relationLookup = await this.buildProductRelationLookup(pagedProducts);

    return {
      items: pagedProducts.map((product) =>
        this.toAdminProductResponse(product, relationLookup.brandNameById, relationLookup.subCategoryNameById),
      ),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getProductById(productId: string): Promise<AdminProductResponse> {
    const product = await this.getProductEntityById(productId);
    const relationLookup = await this.buildProductRelationLookup([product]);
    return this.toAdminProductResponse(
      product,
      relationLookup.brandNameById,
      relationLookup.subCategoryNameById,
    );
  }

  async createProduct(payload: AdminCreateProductPayload): Promise<AdminProductResponse> {
    this.validateCreatePayload(payload);

    const slug = this.normalizeSlug(payload.slug);
    await this.ensureSlugUnique(slug);

    const price = this.parseNonNegativeNumber(payload.price, 'price');
    const originalPrice = this.parseNonNegativeNumber(payload.originalPrice, 'originalPrice');

    if (originalPrice > 0 && price > originalPrice) {
      throw new BadRequestError('price cannot be greater than originalPrice');
    }

    const discount =
      payload.discount === undefined
        ? this.computeDiscount(price, originalPrice)
        : this.parseDiscount(payload.discount);

    const product = this.productRepo.create({
      name: payload.name.trim(),
      slug,
      brand: this.parseObjectId(payload.brandId, 'brandId'),
      subcategories: this.parseObjectId(payload.subCategoryId, 'subCategoryId'),
      price,
      originalPrice,
      discount,
      description: payload.description.trim(),
      longDescription: payload.longDescription.trim(),
      specifications: this.parseRequiredObject(payload.specifications, 'specifications'),
      benefits: this.parseRequiredObject(payload.benefits, 'benefits'),
      usage: payload.usage.trim(),
      ingredients: payload.ingredients.trim(),
      stock: this.parseNonNegativeInteger(payload.stock, 'stock'),
      shipping: payload.shipping.trim(),
      images: this.parseImages(payload.images, true),
      is_active: payload.isActive ?? true,
      review: this.parseOptionalNumber(payload.review, 'review') ?? 0,
    });

    const savedProduct = await this.productRepo.save(product);
    const relationLookup = await this.buildProductRelationLookup([savedProduct]);
    return this.toAdminProductResponse(
      savedProduct,
      relationLookup.brandNameById,
      relationLookup.subCategoryNameById,
    );
  }

  async updateProduct(productId: string, payload: AdminUpdateProductPayload): Promise<AdminProductResponse> {
    const product = await this.getProductEntityById(productId);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError('Update payload is required');
    }

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) {
        throw new BadRequestError('name cannot be empty');
      }
      product.name = name;
    }

    if (payload.slug !== undefined) {
      const slug = this.normalizeSlug(payload.slug);
      await this.ensureSlugUnique(slug, product._id.toHexString());
      product.slug = slug;
    }

    if (payload.brandId !== undefined) {
      product.brand = this.parseObjectId(payload.brandId, 'brandId');
    }

    if (payload.subCategoryId !== undefined) {
      product.subcategories = this.parseObjectId(payload.subCategoryId, 'subCategoryId');
    }

    let priceChanged = false;
    let originalPriceChanged = false;

    if (payload.price !== undefined) {
      product.price = this.parseNonNegativeNumber(payload.price, 'price');
      priceChanged = true;
    }

    if (payload.originalPrice !== undefined) {
      product.originalPrice = this.parseNonNegativeNumber(payload.originalPrice, 'originalPrice');
      originalPriceChanged = true;
    }

    if (product.originalPrice > 0 && product.price > product.originalPrice) {
      throw new BadRequestError('price cannot be greater than originalPrice');
    }

    if (payload.discount !== undefined) {
      product.discount = this.parseDiscount(payload.discount);
    } else if (priceChanged || originalPriceChanged) {
      product.discount = this.computeDiscount(product.price, product.originalPrice);
    }

    if (payload.description !== undefined) {
      const description = payload.description.trim();
      if (!description) {
        throw new BadRequestError('description cannot be empty');
      }
      product.description = description;
    }

    if (payload.longDescription !== undefined) {
      const longDescription = payload.longDescription.trim();
      if (!longDescription) {
        throw new BadRequestError('longDescription cannot be empty');
      }
      product.longDescription = longDescription;
    }

    if (payload.specifications !== undefined) {
      product.specifications = this.parseRequiredObject(payload.specifications, 'specifications');
    }

    if (payload.benefits !== undefined) {
      product.benefits = this.parseRequiredObject(payload.benefits, 'benefits');
    }

    if (payload.usage !== undefined) {
      const usage = payload.usage.trim();
      if (!usage) {
        throw new BadRequestError('usage cannot be empty');
      }
      product.usage = usage;
    }

    if (payload.ingredients !== undefined) {
      const ingredients = payload.ingredients.trim();
      if (!ingredients) {
        throw new BadRequestError('ingredients cannot be empty');
      }
      product.ingredients = ingredients;
    }

    if (payload.stock !== undefined) {
      product.stock = this.parseNonNegativeInteger(payload.stock, 'stock');
    }

    if (payload.shipping !== undefined) {
      const shipping = payload.shipping.trim();
      if (!shipping) {
        throw new BadRequestError('shipping cannot be empty');
      }
      product.shipping = shipping;
    }

    if (payload.images !== undefined) {
      product.images = this.parseImages(payload.images, true);
    }

    if (payload.isActive !== undefined) {
      if (typeof payload.isActive !== 'boolean') {
        throw new BadRequestError('isActive must be a boolean');
      }
      product.is_active = payload.isActive;
    }

    if (payload.review !== undefined) {
      const review = this.parseOptionalNumber(payload.review, 'review');
      product.review = review ?? 0;
    }

    const savedProduct = await this.productRepo.save(product);
    const relationLookup = await this.buildProductRelationLookup([savedProduct]);
    return this.toAdminProductResponse(
      savedProduct,
      relationLookup.brandNameById,
      relationLookup.subCategoryNameById,
    );
  }

  async deleteProduct(productId: string): Promise<void> {
    const objectId = this.parseObjectId(productId, 'productId');
    const result = await this.productRepo.deleteOne({ _id: objectId });

    if (!result.deletedCount) {
      throw new NotFoundError('Product not found');
    }
  }

  private validateCreatePayload(payload: AdminCreateProductPayload): void {
    if (!payload.name?.trim()) {
      throw new BadRequestError('name is required');
    }

    if (!payload.slug?.trim()) {
      throw new BadRequestError('slug is required');
    }

    if (!payload.brandId?.trim()) {
      throw new BadRequestError('brandId is required');
    }

    if (!payload.subCategoryId?.trim()) {
      throw new BadRequestError('subCategoryId is required');
    }

    this.parseNonNegativeNumber(payload.price, 'price');
    this.parseNonNegativeNumber(payload.originalPrice, 'originalPrice');

    if (!payload.description?.trim()) {
      throw new BadRequestError('description is required');
    }

    if (!payload.longDescription?.trim()) {
      throw new BadRequestError('longDescription is required');
    }

    if (!payload.usage?.trim()) {
      throw new BadRequestError('usage is required');
    }

    if (!payload.ingredients?.trim()) {
      throw new BadRequestError('ingredients is required');
    }

    this.parseRequiredObject(payload.specifications, 'specifications');
    this.parseRequiredObject(payload.benefits, 'benefits');
    this.parseNonNegativeInteger(payload.stock, 'stock');

    if (!payload.shipping?.trim()) {
      throw new BadRequestError('shipping is required');
    }

    this.parseImages(payload.images, true);
  }

  private async getProductEntityById(productId: string): Promise<Product> {
    const objectId = this.parseObjectId(productId, 'productId');
    const product = await this.productRepo.findOne({ where: { _id: objectId } });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  private async ensureSlugUnique(slug: string, excludeProductId?: string): Promise<void> {
    const existingProduct = await this.productRepo.findOne({ where: { slug } });

    if (!existingProduct) {
      return;
    }

    if (!excludeProductId || existingProduct._id.toHexString() !== excludeProductId) {
      throw new ConflictError('slug already exists');
    }
  }

  private normalizeSlug(slug: string): string {
    const normalized = slug.trim();

    if (!normalized) {
      throw new BadRequestError('slug is required');
    }

    return normalized;
  }

  private parseObjectId(value: string, fieldName: string): ObjectId {
    if (!value?.trim()) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    try {
      return new ObjectId(value.trim());
    } catch {
      throw new BadRequestError(`${fieldName} is invalid`);
    }
  }

  private parseNonNegativeNumber(value: NumberInput, fieldName: string): number {
    const parsedValue = this.parseNumber(value, fieldName);

    if (parsedValue < 0) {
      throw new BadRequestError(`${fieldName} must be greater than or equal to 0`);
    }

    return parsedValue;
  }

  private parseNonNegativeInteger(value: NumberInput, fieldName: string): number {
    const parsedValue = this.parseNonNegativeNumber(value, fieldName);

    if (!Number.isInteger(parsedValue)) {
      throw new BadRequestError(`${fieldName} must be an integer`);
    }

    return parsedValue;
  }

  private parseOptionalNumber(value: NumberInput | undefined, fieldName: string): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return this.parseNumber(value, fieldName);
  }

  private parseDiscount(value: NumberInput): number {
    const discount = this.parseNonNegativeNumber(value, 'discount');
    if (discount > 100) {
      throw new BadRequestError('discount must be less than or equal to 100');
    }

    return discount;
  }

  private parseNumber(value: NumberInput, fieldName: string): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsedValue)) {
      throw new BadRequestError(`${fieldName} is invalid`);
    }

    return parsedValue;
  }

  private parseRequiredObject<T>(value: T, fieldName: string): T {
    if (value === undefined || value === null || typeof value !== 'object') {
      throw new BadRequestError(`${fieldName} is required`);
    }

    return value;
  }

  private parseImages(value: string[] | string, required: boolean): string[] {
    if (Array.isArray(value)) {
      const images = value.map((item) => item.trim()).filter(Boolean);
      if (required && images.length === 0) {
        throw new BadRequestError('images is required');
      }
      return images;
    }

    if (typeof value === 'string') {
      const images = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (required && images.length === 0) {
        throw new BadRequestError('images is required');
      }
      return images;
    }

    if (required) {
      throw new BadRequestError('images is required');
    }

    return [];
  }

  private computeDiscount(price: number, originalPrice: number): number {
    if (originalPrice <= 0) {
      return 0;
    }

    const raw = Math.round((1 - price / originalPrice) * 100);
    return Math.max(0, Math.min(100, raw));
  }

  private compareProducts(a: Product, b: Product, sortBy?: SortByOption): number {
    const aCreatedAt = this.getCreatedAtTimestamp(a.created_at);
    const bCreatedAt = this.getCreatedAtTimestamp(b.created_at);

    switch (sortBy) {
      case 'priceAsc':
        return a.price - b.price || bCreatedAt - aCreatedAt;
      case 'priceDesc':
        return b.price - a.price || bCreatedAt - aCreatedAt;
      case 'discountDesc':
        return b.discount - a.discount || bCreatedAt - aCreatedAt;
      case 'reviewDesc':
        return b.review - a.review || bCreatedAt - aCreatedAt;
      default:
        return bCreatedAt - aCreatedAt;
    }
  }

  private getCreatedAtTimestamp(value: unknown): number {
    if (value && typeof (value as Date).getTime === 'function') {
      const timestamp = (value as Date).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      const timestamp = parsed.getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    return 0;
  }

  private toAdminProductResponse(
    product: Product,
    brandNameById: Map<string, string>,
    subCategoryNameById: Map<string, string>,
  ): AdminProductResponse {
    const brandId = this.getObjectIdString(product.brand);
    const subCategoryId = this.getObjectIdString(product.subcategories);

    return {
      id: product._id.toHexString(),
      name: product.name,
      slug: product.slug,
      brandId: brandId ?? String(product.brand),
      brandName: brandId ? brandNameById.get(brandId) : undefined,
      subCategoryId: subCategoryId ?? String(product.subcategories),
      subCategoryName: subCategoryId ? subCategoryNameById.get(subCategoryId) : undefined,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      review: product.review,
      description: product.description,
      longDescription: product.longDescription,
      specifications: product.specifications,
      benefits: product.benefits,
      usage: product.usage,
      ingredients: product.ingredients,
      stock: product.stock,
      shipping: product.shipping,
      images: product.images ?? [],
      isActive: product.is_active,
      createdAt: product.created_at,
    };
  }

  private async buildProductRelationLookup(products: Product[]): Promise<{
    brandNameById: Map<string, string>;
    subCategoryNameById: Map<string, string>;
  }> {
    const brandIds = new Map<string, ObjectId>();
    const subCategoryIds = new Map<string, ObjectId>();

    for (const product of products) {
      const brandId = this.toObjectId(product.brand);
      if (brandId) {
        brandIds.set(brandId.toHexString(), brandId);
      }

      const subCategoryId = this.toObjectId(product.subcategories);
      if (subCategoryId) {
        subCategoryIds.set(subCategoryId.toHexString(), subCategoryId);
      }
    }

    const [brands, categories] = await Promise.all([
      brandIds.size
        ? this.brandRepo.find({ where: { _id: { $in: Array.from(brandIds.values()) } } })
        : Promise.resolve([]),
      subCategoryIds.size
        ? this.categoryRepo.find({ where: { 'subcategories._id': { $in: Array.from(subCategoryIds.values()) } } })
        : Promise.resolve([]),
    ]);

    const brandNameById = new Map<string, string>();
    for (const brand of brands) {
      brandNameById.set(brand._id.toHexString(), brand.name);
    }

    const subCategoryNameById = new Map<string, string>();
    for (const category of categories) {
      for (const subCategory of category.subcategories ?? []) {
        const subCategoryId = this.getObjectIdString(subCategory._id);
        if (subCategoryId && subCategory.name) {
          subCategoryNameById.set(subCategoryId, subCategory.name);
        }
      }
    }

    return { brandNameById, subCategoryNameById };
  }

  private getObjectIdString(value: unknown): string | undefined {
    if (value instanceof ObjectId) {
      return value.toHexString();
    }

    if (typeof value === 'string') {
      return value.trim() ? value.trim() : undefined;
    }

    return undefined;
  }

  private toObjectId(value: unknown): ObjectId | undefined {
    if (value instanceof ObjectId) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      try {
        return new ObjectId(trimmed);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}
