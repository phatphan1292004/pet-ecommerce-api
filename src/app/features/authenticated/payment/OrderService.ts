import { AppDataSource } from '@/app/database';
import { Cart } from '@/app/entities/Cart';
import { Order } from '@/app/entities/Order';
import { BadRequestError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface CreateOrderPayload {
  customerId: string;
  cartId: string;
  status?: string;
  paymentMethod?: string;
  arrivalName: string;
  arrivalPhone: string;
  arrivalAddress: string;
  arrivalTime?: string | Date;
  note?: string;
  coupon?: string;
}

export interface OrderWithCart {
  order: Order;
  cart: Cart | null;
}

export interface GetOrdersByCustomerQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface OrderListItem {
  id: string;
  customerId: string;
  cartId: string;
  status: string;
  paymentMethod: string;
  arrivalName: string;
  arrivalPhone: string;
  arrivalAddress: string;
  arrivalTime?: Date;
  note?: string;
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
  cart: {
    id: string;
    status: string;
    totalPrice: number;
    totalDiscount: number;
    finalPrice: number;
    products: Cart['products'];
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export interface OrderListResponse {
  items: OrderListItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class OrderService {
  private orderRepo = AppDataSource.getMongoRepository(Order);
  private cartRepo = AppDataSource.getMongoRepository(Cart);
  private couponRepo = AppDataSource.getMongoRepository('Coupon');

  async getOrdersByCustomer(
    customerId: string,
    query: GetOrdersByCustomerQuery = {},
  ): Promise<OrderListResponse> {
    const normalizedCustomerId = customerId?.trim();
    if (!normalizedCustomerId) {
      throw new BadRequestError('customerId is required');
    }

    const normalizedStatus = query.status?.trim();
    const where: Record<string, string> = {
      customerId: normalizedCustomerId,
    };

    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
    const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 10;
    const limit = Math.min(limitRaw, 50);

    const orders = await this.orderRepo.find({
      where,
    });

    if (orders.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const cartObjectIds = orders
      .map((order) => this.toObjectId(order.cartId))
      .filter((id): id is ObjectId => id !== null);

    const uniqueCartObjectIds = Array.from(
      new Map(cartObjectIds.map((id) => [id.toHexString(), id])).values(),
    );

    const carts =
      uniqueCartObjectIds.length > 0
        ? await this.cartRepo.find({
            where: {
              _id: {
                $in: uniqueCartObjectIds,
              } as any,
            },
          })
        : [];

    const cartsById = new Map(carts.map((cart) => [cart._id.toHexString(), cart]));

    const sortedOrders = orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const totalItems = sortedOrders.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const pagedOrders = sortedOrders.slice(startIndex, startIndex + limit);

    const items = pagedOrders.map((order) => {
        const cartObjectId = this.toObjectId(order.cartId);
        const cart = cartObjectId ? cartsById.get(cartObjectId.toHexString()) ?? null : null;

        return {
          id: order._id.toHexString(),
          customerId: order.customerId,
          cartId: order.cartId,
          status: order.status,
          paymentMethod: order.paymentMethod,
          arrivalName: order.arrivalName,
          arrivalPhone: order.arrivalPhone,
          arrivalAddress: order.arrivalAddress,
          arrivalTime: order.arrivalTime,
          note: order.note,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          cart: cart
            ? {
                id: cart._id.toHexString(),
                status: cart.status,
                totalPrice: cart.totalPrice,
                totalDiscount: cart.totalDiscount,
                finalPrice: cart.finalPrice,
                products: cart.products,
                createdAt: cart.createdAt,
                updatedAt: cart.updatedAt,
              }
            : null,
        };
      });

    return {
      items,
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

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    this.validatePayload(payload);

    let cartObjectId: ObjectId;
    try {
      cartObjectId = new ObjectId(payload.cartId.trim());
    } catch {
      throw new BadRequestError('cartId is invalid');
    }

    const cart = await this.cartRepo.findOne({
      where: {
        _id: cartObjectId,
      },
    });

    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    if (cart.customerId !== payload.customerId.trim()) {
      throw new BadRequestError('cartId does not belong to customerId');
    }

    // If coupon provided, validate and update usedCount
    if (payload.coupon && payload.coupon.trim()) {
      const code = payload.coupon.trim().toUpperCase();

      const coupon = await this.couponRepo.findOne({ where: { code } } as any);

      if (!coupon) {
        throw new BadRequestError('coupon is invalid');
      }

      const now = new Date();

      if (!coupon.isActive) {
        throw new BadRequestError('coupon is not active');
      }

      if (coupon.startDate && new Date(coupon.startDate).getTime() > now.getTime()) {
        throw new BadRequestError('coupon is not yet valid');
      }

      if (coupon.endDate && new Date(coupon.endDate).getTime() < now.getTime()) {
        throw new BadRequestError('coupon has expired');
      }

      if (coupon.usageLimit !== undefined && coupon.usageLimit !== null) {
        if (coupon.usedCount >= coupon.usageLimit) {
          throw new BadRequestError('coupon usage limit exceeded');
        }
      }

      // check minOrderValue against cart finalPrice if available
      const cartFinal = typeof cart.finalPrice === 'number' ? cart.finalPrice : 0;
      if (coupon.minOrderValue !== undefined && coupon.minOrderValue > cartFinal) {
        throw new BadRequestError('cart does not meet coupon minimum order value');
      }

      // increment usedCount (mark coupon as used once for this order)
      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await this.couponRepo.save(coupon as any);
    }

    const order = this.orderRepo.create({
      customerId: payload.customerId.trim(),
      cartId: payload.cartId.trim(),
      status: payload.status?.trim() || 'pending',
      paymentMethod: payload.paymentMethod?.trim() || 'cash',
      arrivalName: payload.arrivalName.trim(),
      arrivalPhone: payload.arrivalPhone.trim(),
      arrivalAddress: payload.arrivalAddress.trim(),
      couponCode: payload.coupon?.trim(),
      arrivalTime: this.parseArrivalTime(payload.arrivalTime),
      note: payload.note?.trim(),
    });

    return this.orderRepo.save(order);
  }

  private validatePayload(payload: CreateOrderPayload): void {
    if (!payload.customerId || payload.customerId.trim().length === 0) {
      throw new BadRequestError('customerId is required');
    }

    if (!payload.cartId || payload.cartId.trim().length === 0) {
      throw new BadRequestError('cartId is required');
    }

    if (!payload.arrivalName || payload.arrivalName.trim().length === 0) {
      throw new BadRequestError('arrivalName is required');
    }

    if (!payload.arrivalPhone || payload.arrivalPhone.trim().length === 0) {
      throw new BadRequestError('arrivalPhone is required');
    }

    if (!payload.arrivalAddress || payload.arrivalAddress.trim().length === 0) {
      throw new BadRequestError('arrivalAddress is required');
    }
  }

  private parseArrivalTime(arrivalTime?: string | Date): Date | undefined {
    if (!arrivalTime) {
      return undefined;
    }

    const value = arrivalTime instanceof Date ? arrivalTime : new Date(arrivalTime);

    if (Number.isNaN(value.getTime())) {
      throw new BadRequestError('arrivalTime is invalid');
    }

    return value;
  }

  private toObjectId(value?: string): ObjectId | null {
    if (!value) {
      return null;
    }

    try {
      return new ObjectId(value.trim());
    } catch {
      return null;
    }
  }
}
