import { AppDataSource } from '@/app/database';
import { Cart, CartProduct } from '@/app/entities/Cart';
import { BadRequestError, NotFoundError } from '@/app/exceptions/AppError';

export interface UpsertCartPayload {
  customerId: string;
  status?: 'open' | 'close';
  totalPrice?: number;
  totalDiscount?: number;
  finalPrice?: number;
  products?: CartProduct[];
  items?: CartProduct[];
}

export interface SyncCartItemPayload {
  productId: string;
  quantity: number;
  price?: number;
  name?: string;
  image?: string;
  slug?: string;
}

export class CartService {
  private repo = AppDataSource.getMongoRepository(Cart);

  async getCart(customerId: string, status: string = 'open'): Promise<Cart | null> {
    this.validateCustomerId(customerId);

    return this.repo.findOne({
      where: {
        customerId: customerId.trim(),
        status,
      },
    });
  }

  async upsertOpenCart(payload: UpsertCartPayload): Promise<Cart> {
    this.validateCustomerId(payload.customerId);

    const products = this.normalizeProducts(payload.products ?? payload.items ?? []);
    const totalDiscount = Number(payload.totalDiscount ?? 0);

    const totals = this.calculateTotals(products, totalDiscount);

    const existingCart = await this.getCart(payload.customerId, 'open');

    if (existingCart) {
      existingCart.products = products;
      existingCart.totalPrice = totals.totalPrice;
      existingCart.totalDiscount = totals.totalDiscount;
      existingCart.finalPrice = totals.finalPrice;
      return this.repo.save(existingCart);
    }

    const newCart = this.repo.create({
      customerId: payload.customerId.trim(),
      status: 'open',
      products,
      totalPrice: totals.totalPrice,
      totalDiscount: totals.totalDiscount,
      finalPrice: totals.finalPrice,
    });

    return this.repo.save(newCart);
  }

  async syncCartItem(customerId: string, payload: SyncCartItemPayload): Promise<Cart> {
    this.validateCustomerId(customerId);

    if (!payload.productId || payload.productId.trim().length === 0) {
      throw new BadRequestError('productId is required');
    }

    const quantity = Math.max(0, Number(payload.quantity || 0));
    const existingCart = await this.getCart(customerId, 'open');

    const products = existingCart?.products ? [...existingCart.products] : [];
    const index = products.findIndex((product) => product.productId === payload.productId.trim());

    if (quantity === 0) {
      if (index >= 0) {
        products.splice(index, 1);
      }
    } else {
      const currentPrice = index >= 0 ? products[index].price : Number(payload.price ?? 0);
      const nextProduct: CartProduct = {
        productId: payload.productId.trim(),
        quantity,
        price: Number(payload.price ?? currentPrice ?? 0),
        name: payload.name,
        image: payload.image,
        slug: payload.slug,
      };

      if (index >= 0) {
        products[index] = {
          ...products[index],
          ...nextProduct,
        };
      } else {
        products.push(nextProduct);
      }
    }

    const cartPayload: UpsertCartPayload = {
      customerId,
      products,
      totalDiscount: existingCart?.totalDiscount ?? 0,
    };

    return this.upsertOpenCart(cartPayload);
  }

  async removeCartItem(customerId: string, productId: string): Promise<Cart> {
    this.validateCustomerId(customerId);

    if (!productId || productId.trim().length === 0) {
      throw new BadRequestError('productId is required');
    }

    const existingCart = await this.getCart(customerId, 'open');
    const products = (existingCart?.products ?? []).filter((product) => product.productId !== productId.trim());

    return this.upsertOpenCart({
      customerId,
      products,
      totalDiscount: existingCart?.totalDiscount ?? 0,
    });
  }

  async clearOpenCart(customerId: string): Promise<Cart> {
    this.validateCustomerId(customerId);
    const existingCart = await this.getCart(customerId, 'open');

    return this.upsertOpenCart({
      customerId,
      products: [],
      totalDiscount: existingCart?.totalDiscount ?? 0,
    });
  }

  async closeOpenCart(customerId: string): Promise<Cart> {
    this.validateCustomerId(customerId);

    const existingCart = await this.getCart(customerId, 'open');
    if (!existingCart) {
      throw new NotFoundError('Open cart not found');
    }

    existingCart.status = 'close';
    return this.repo.save(existingCart);
  }

  private normalizeProducts(products: CartProduct[]): CartProduct[] {
    if (!Array.isArray(products)) {
      return [];
    }

    return products
      .filter((product) => product && typeof product.productId === 'string' && product.productId.trim().length > 0)
      .map((product) => ({
        productId: product.productId.trim(),
        quantity: Math.max(1, Number(product.quantity || 1)),
        price: Math.max(0, Number(product.price || 0)),
        name: product.name,
        image: product.image,
        slug: product.slug,
      }));
  }

  private calculateTotals(products: CartProduct[], discountValue: number): {
    totalPrice: number;
    totalDiscount: number;
    finalPrice: number;
  } {
    const totalPrice = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalDiscount = Math.max(0, Number(discountValue || 0));
    const finalPrice = Math.max(0, totalPrice - totalDiscount);

    return {
      totalPrice,
      totalDiscount,
      finalPrice,
    };
  }

  private validateCustomerId(customerId: string): void {
    if (!customerId || customerId.trim().length === 0) {
      throw new BadRequestError('customerId is required');
    }
  }
}