import { AppDataSource } from '@/app/database';
import { Customer } from '@/app/entities/Customer';
import { Favorite } from '@/app/entities/Favorite';
import { Product } from '@/app/entities/Product';
import { BadRequestError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface AddFavoritePayload {
  customerId: string;
  productId: string;
}

export interface FavoriteProductResponse {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
  isActive: boolean;
}

export interface FavoriteListResponse {
  customerId: string;
  items: FavoriteProductResponse[];
  totalItems: number;
}

export class FavoriteService {
  private favoriteRepo = AppDataSource.getMongoRepository(Favorite);
  private productRepo = AppDataSource.getMongoRepository(Product);
  private customerRepo = AppDataSource.getMongoRepository(Customer);

  async addFavorite(payload: AddFavoritePayload): Promise<FavoriteListResponse> {
    const customerId = this.normalizeCustomerId(payload.customerId);
    const productId = this.normalizeProductId(payload.productId);
    const productObjectId = new ObjectId(productId);

    await this.ensureCustomerExists(customerId);
    await this.ensureProductExists(productId);

    const favorite = await this.getOrCreateFavoriteByCustomerId(customerId);
    const existingProductIds = this.normalizeObjectIdArray(favorite.products);

    if (!existingProductIds.some((id) => id.equals(productObjectId))) {
      favorite.products = [...existingProductIds, productObjectId];
      await this.favoriteRepo.save(favorite);
    }

    return this.toFavoriteListResponse(favorite);
  }

  async getFavoritesByCustomerId(customerId: string): Promise<FavoriteListResponse> {
    const normalizedCustomerId = this.normalizeCustomerId(customerId);
    await this.ensureCustomerExists(normalizedCustomerId);

    const favorite = await this.favoriteRepo.findOne({
      where: {
        customerId: normalizedCustomerId,
      },
    });

    if (!favorite) {
      return {
        customerId: normalizedCustomerId,
        items: [],
        totalItems: 0,
      };
    }

    return this.toFavoriteListResponse(favorite);
  }

  private async getOrCreateFavoriteByCustomerId(customerId: string): Promise<Favorite> {
    const existing = await this.favoriteRepo.findOne({
      where: {
        customerId,
      },
    });

    if (existing) {
      const legacyProductIds = (existing as Favorite & { productIds?: unknown }).productIds;
      existing.products = this.normalizeObjectIdArray(existing.products ?? legacyProductIds);
      return existing;
    }

    const created = this.favoriteRepo.create({
      customerId,
      products: [],
    });

    return this.favoriteRepo.save(created);
  }

  private async toFavoriteListResponse(favorite: Favorite): Promise<FavoriteListResponse> {
    const legacyProductIds = (favorite as Favorite & { productIds?: unknown }).productIds;
    const productObjectIds = this.normalizeObjectIdArray(favorite.products ?? legacyProductIds);
    const productIds = productObjectIds.map((id) => id.toHexString());

    if (productIds.length === 0) {
      return {
        customerId: favorite.customerId,
        items: [],
        totalItems: 0,
      };
    }

    const products = await this.productRepo.find({
      where: {
        _id: {
          $in: productObjectIds,
        } as never,
      },
    });

    const productById = new Map(products.map((product) => [product._id.toHexString(), product]));

    const items = productIds
      .map((id) => productById.get(id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => ({
        id: product._id.toHexString(),
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount,
        image: product.images?.[0] ?? '',
        isActive: Boolean(product.is_active),
      }));

    return {
      customerId: favorite.customerId,
      items,
      totalItems: items.length,
    };
  }

  private normalizeObjectIdArray(values: unknown): ObjectId[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map((value) => {
        if (value instanceof ObjectId) {
          return value;
        }

        if (typeof value === 'string') {
          const normalized = value.trim();
          return ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
        }

        return null;
      })
      .filter((value): value is ObjectId => value instanceof ObjectId);
  }

  private normalizeCustomerId(customerId: string): string {
    const normalized = customerId?.trim();

    if (!normalized) {
      throw new BadRequestError('customerId is required');
    }

    return normalized;
  }

  private normalizeProductId(productId: string): string {
    const normalized = productId?.trim();

    if (!normalized) {
      throw new BadRequestError('productId is required');
    }

    if (!ObjectId.isValid(normalized)) {
      throw new BadRequestError('productId is invalid');
    }

    return normalized;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const customer = await this.customerRepo.findOne({
      where: {
        firebaseUid: customerId,
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.productRepo.findOne({
      where: {
        _id: new ObjectId(productId),
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }
  }
}
