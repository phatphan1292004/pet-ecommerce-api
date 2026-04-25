import { AppDataSource } from '@/app/database';
import { Cart } from '@/app/entities/Cart';
import { Customer } from '@/app/entities/Customer';
import { Order } from '@/app/entities/Order';
import { BadRequestError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface AdminOrderListQuery {
  status?: string;
  paymentMethod?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface AdminCreateOrderPayload {
  customerId: string;
  cartId: string;
  status?: string;
  paymentMethod?: string;
  arrivalName: string;
  arrivalPhone: string;
  arrivalAddress: string;
  arrivalTime?: string | Date;
  note?: string;
}

export interface AdminUpdateOrderPayload {
  customerId?: string;
  cartId?: string;
  status?: string;
  paymentMethod?: string;
  arrivalName?: string;
  arrivalPhone?: string;
  arrivalAddress?: string;
  arrivalTime?: string | Date;
  note?: string;
}

export interface AdminUpdateOrderStatusPayload {
  status: string;
}

export interface AdminOrderListResponse {
  items: AdminOrderItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AdminOrderItem extends Order {
  customerPhotoURL?: string;
  finalPrice: number | null;
}

export interface AdminOrderDetail extends AdminOrderItem {
  cart: Cart | null;
}

export class AdminOrderService {
  private orderRepo = AppDataSource.getMongoRepository(Order);
  private cartRepo = AppDataSource.getMongoRepository(Cart);
  private customerRepo = AppDataSource.getMongoRepository(Customer);

  async getOrders(query: AdminOrderListQuery = {}): Promise<AdminOrderListResponse> {
    const where: Record<string, string> = {};

    if (query.status?.trim()) {
      where.status = query.status.trim();
    }

    if (query.paymentMethod?.trim()) {
      where.paymentMethod = query.paymentMethod.trim();
    }

    if (query.customerId?.trim()) {
      where.customerId = query.customerId.trim();
    }

    const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
    const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 10;
    const limit = Math.min(limitRaw, 50);

    const orders = await this.orderRepo.find({ where });
    const sortedOrders = orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalItems = sortedOrders.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const pagedOrders = sortedOrders.slice(startIndex, startIndex + limit);

    const cartObjectIds = pagedOrders
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

    const customerPhotoMap = await this.getCustomerPhotoMap(
      pagedOrders.map((order) => order.customerId),
    );

    const items = pagedOrders.map((order) => {
      const cartObjectId = this.toObjectId(order.cartId);
      const cart = cartObjectId ? cartsById.get(cartObjectId.toHexString()) : null;

      return {
        ...order,
        customerPhotoURL: customerPhotoMap.get(order.customerId),
        finalPrice: typeof cart?.finalPrice === 'number' ? cart.finalPrice : null,
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

  async getOrderById(orderId: string): Promise<AdminOrderDetail> {
    const order = await this.getOrderEntityById(orderId);

    const customerPhotoMap = await this.getCustomerPhotoMap([order.customerId]);
    const cartObjectId = this.toObjectId(order.cartId);
    const cart = cartObjectId
      ? await this.cartRepo.findOne({
          where: { _id: cartObjectId },
        })
      : null;

    return {
      ...order,
      customerPhotoURL: customerPhotoMap.get(order.customerId),
      finalPrice: typeof cart?.finalPrice === 'number' ? cart.finalPrice : null,
      cart,
    };
  }

  async createOrder(payload: AdminCreateOrderPayload): Promise<Order> {
    this.validateCreatePayload(payload);

    const customerId = payload.customerId.trim();
    const cartId = payload.cartId.trim();

    await this.ensureCartBelongsToCustomer(cartId, customerId);

    const order = this.orderRepo.create({
      customerId,
      cartId,
      status: payload.status?.trim() || 'pending',
      paymentMethod: payload.paymentMethod?.trim() || 'cash',
      arrivalName: payload.arrivalName.trim(),
      arrivalPhone: payload.arrivalPhone.trim(),
      arrivalAddress: payload.arrivalAddress.trim(),
      arrivalTime: this.parseArrivalTime(payload.arrivalTime),
      note: payload.note?.trim(),
    });

    return this.orderRepo.save(order);
  }

  async updateOrder(orderId: string, payload: AdminUpdateOrderPayload): Promise<Order> {
    const order = await this.getOrderEntityById(orderId);
    const hasPayload = Object.keys(payload).length > 0;

    if (!hasPayload) {
      throw new BadRequestError('Update payload is required');
    }

    const nextCustomerId = payload.customerId?.trim() ?? order.customerId;
    const nextCartId = payload.cartId?.trim() ?? order.cartId;

    if (payload.customerId !== undefined && nextCustomerId.length === 0) {
      throw new BadRequestError('customerId cannot be empty');
    }

    if (payload.cartId !== undefined && nextCartId.length === 0) {
      throw new BadRequestError('cartId cannot be empty');
    }

    if (payload.customerId !== undefined || payload.cartId !== undefined) {
      await this.ensureCartBelongsToCustomer(nextCartId, nextCustomerId);
    }

    if (payload.status !== undefined) {
      const status = payload.status.trim();
      if (!status) {
        throw new BadRequestError('status cannot be empty');
      }
      order.status = status;
    }

    if (payload.paymentMethod !== undefined) {
      const paymentMethod = payload.paymentMethod.trim();
      if (!paymentMethod) {
        throw new BadRequestError('paymentMethod cannot be empty');
      }
      order.paymentMethod = paymentMethod;
    }

    if (payload.arrivalName !== undefined) {
      const arrivalName = payload.arrivalName.trim();
      if (!arrivalName) {
        throw new BadRequestError('arrivalName cannot be empty');
      }
      order.arrivalName = arrivalName;
    }

    if (payload.arrivalPhone !== undefined) {
      const arrivalPhone = payload.arrivalPhone.trim();
      if (!arrivalPhone) {
        throw new BadRequestError('arrivalPhone cannot be empty');
      }
      order.arrivalPhone = arrivalPhone;
    }

    if (payload.arrivalAddress !== undefined) {
      const arrivalAddress = payload.arrivalAddress.trim();
      if (!arrivalAddress) {
        throw new BadRequestError('arrivalAddress cannot be empty');
      }
      order.arrivalAddress = arrivalAddress;
    }

    if (payload.arrivalTime !== undefined) {
      order.arrivalTime = this.parseArrivalTime(payload.arrivalTime);
    }

    if (payload.note !== undefined) {
      const note = payload.note.trim();
      order.note = note || undefined;
    }

    order.customerId = nextCustomerId;
    order.cartId = nextCartId;

    return this.orderRepo.save(order);
  }

  async updateOrderStatus(orderId: string, payload: AdminUpdateOrderStatusPayload): Promise<Order> {
    const status = payload.status?.trim();
    if (!status) {
      throw new BadRequestError('status is required');
    }

    const order = await this.getOrderEntityById(orderId);
    order.status = status;

    return this.orderRepo.save(order);
  }

  async deleteOrder(orderId: string): Promise<void> {
    const objectId = this.parseObjectId(orderId, 'orderId');

    const result = await this.orderRepo.deleteOne({ _id: objectId });
    if (!result.deletedCount) {
      throw new NotFoundError('Order not found');
    }
  }

  private validateCreatePayload(payload: AdminCreateOrderPayload): void {
    if (!payload.customerId?.trim()) {
      throw new BadRequestError('customerId is required');
    }

    if (!payload.cartId?.trim()) {
      throw new BadRequestError('cartId is required');
    }

    if (!payload.arrivalName?.trim()) {
      throw new BadRequestError('arrivalName is required');
    }

    if (!payload.arrivalPhone?.trim()) {
      throw new BadRequestError('arrivalPhone is required');
    }

    if (!payload.arrivalAddress?.trim()) {
      throw new BadRequestError('arrivalAddress is required');
    }
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

  private parseArrivalTime(arrivalTime?: string | Date): Date | undefined {
    if (arrivalTime === undefined) {
      return undefined;
    }

    const value = arrivalTime instanceof Date ? arrivalTime : new Date(arrivalTime);
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestError('arrivalTime is invalid');
    }

    return value;
  }

  private async getOrderEntityById(orderId: string): Promise<Order> {
    const objectId = this.parseObjectId(orderId, 'orderId');

    const order = await this.orderRepo.findOne({
      where: { _id: objectId },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  private async ensureCartBelongsToCustomer(cartId: string, customerId: string): Promise<void> {
    const cartObjectId = this.parseObjectId(cartId, 'cartId');

    const cart = await this.cartRepo.findOne({
      where: { _id: cartObjectId },
    });

    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    if (cart.customerId !== customerId) {
      throw new BadRequestError('cartId does not belong to customerId');
    }
  }

  private async getCustomerPhotoMap(customerIds: string[]): Promise<Map<string, string | undefined>> {
    const normalizedIds = Array.from(
      new Set(customerIds.map((customerId) => customerId.trim()).filter((customerId) => customerId.length > 0)),
    );

    if (normalizedIds.length === 0) {
      return new Map();
    }

    const customers = await this.customerRepo.find({
      where: {
        firebaseUid: {
          $in: normalizedIds,
        } as any,
      },
    });

    return new Map(customers.map((customer) => [customer.firebaseUid, customer.photoURL]));
  }

  private toObjectId(value?: string): ObjectId | null {
    if (!value?.trim()) {
      return null;
    }

    try {
      return new ObjectId(value.trim());
    } catch {
      return null;
    }
  }
}
