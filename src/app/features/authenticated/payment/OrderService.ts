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
}

export class OrderService {
  private orderRepo = AppDataSource.getMongoRepository(Order);
  private cartRepo = AppDataSource.getMongoRepository(Cart);

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

    console.log('Creating order with payload:', payload);
    const order = this.orderRepo.create({
      customerId: payload.customerId.trim(),
      cartId: payload.cartId.trim(),
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
}
