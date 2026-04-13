import { AppDataSource } from '@/app/database';
import { Cart } from '@/app/entities/Cart';
import { Customer } from '@/app/entities/Customer';
import { Order } from '@/app/entities/Order';
import { ObjectId } from 'mongodb';

interface DashboardSummary {
  revenueToday: number;
  newOrdersToday: number;
  newUsersToday: number;
  completionRate: number;
}

interface DashboardOverviewItem {
  date: string;
  revenue: number;
  orders: number;
  users: number;
}

interface DashboardActivity {
  type: 'order' | 'user';
  message: string;
  createdAt: Date;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  overview7Days: DashboardOverviewItem[];
  recentActivities: DashboardActivity[];
}

export class AdminDashboardService {
  private orderRepo = AppDataSource.getMongoRepository(Order);
  private cartRepo = AppDataSource.getMongoRepository(Cart);
  private customerRepo = AppDataSource.getMongoRepository(Customer);

  async getDashboard(): Promise<DashboardResponse> {
    const [orders, customers] = await Promise.all([this.orderRepo.find(), this.customerRepo.find()]);

    const cartIds = Array.from(
      new Set(
        orders
          .map((order) => this.toObjectId(order.cartId))
          .filter((cartId): cartId is ObjectId => cartId !== null)
          .map((cartId) => cartId.toHexString()),
      ),
    );

    const carts =
      cartIds.length > 0
        ? await this.cartRepo.find({
            where: {
              _id: {
                $in: cartIds.map((id) => new ObjectId(id)),
              } as any,
            },
          })
        : [];

    const cartsById = new Map(carts.map((cart) => [cart._id.toHexString(), cart]));
    const todayRange = this.getDayRange(new Date());

    const ordersToday = orders.filter((order) => this.isInRange(order.createdAt, todayRange.start, todayRange.end));
    const usersToday = customers.filter((user) => this.isInRange(user.createdAt, todayRange.start, todayRange.end));
    const completedOrders = orders.filter((order) => order.status === 'close');

    const revenueToday = ordersToday
      .filter((order) => order.status === 'close')
      .reduce((sum, order) => {
        const cart = this.getCartByOrder(order, cartsById);
        return sum + (cart?.finalPrice ?? 0);
      }, 0);

    const completionRate = orders.length > 0 ? Number(((completedOrders.length / orders.length) * 100).toFixed(1)) : 0;

    const overview7Days = this.buildOverview7Days(orders, customers, cartsById);
    const recentActivities = this.buildRecentActivities(orders, customers);

    return {
      summary: {
        revenueToday,
        newOrdersToday: ordersToday.length,
        newUsersToday: usersToday.length,
        completionRate,
      },
      overview7Days,
      recentActivities,
    };
  }

  private buildOverview7Days(
    orders: Order[],
    customers: Customer[],
    cartsById: Map<string, Cart>,
  ): DashboardOverviewItem[] {
    const items: DashboardOverviewItem[] = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const range = this.getDayRange(date);

      const ordersOfDay = orders.filter((order) => this.isInRange(order.createdAt, range.start, range.end));
      const usersOfDay = customers.filter((user) => this.isInRange(user.createdAt, range.start, range.end));

      const revenue = ordersOfDay
        .filter((order) => order.status === 'close')
        .reduce((sum, order) => {
          const cart = this.getCartByOrder(order, cartsById);
          return sum + (cart?.finalPrice ?? 0);
        }, 0);

      items.push({
        date: range.start.toISOString().slice(0, 10),
        revenue,
        orders: ordersOfDay.length,
        users: usersOfDay.length,
      });
    }

    return items;
  }

  private buildRecentActivities(orders: Order[], customers: Customer[]): DashboardActivity[] {
    const orderActivities: DashboardActivity[] = orders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6)
      .map((order) => ({
        type: 'order',
        message: `Don #${order._id.toHexString().slice(-6)} da duoc cap nhat trang thai ${order.status}`,
        createdAt: order.createdAt,
      }));

    const userActivities: DashboardActivity[] = customers
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 4)
      .map((user) => ({
        type: 'user',
        message: `Khach hang ${user.displayName} dang ky tai khoan`,
        createdAt: user.createdAt,
      }));

    return [...orderActivities, ...userActivities]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8);
  }

  private getDayRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private isInRange(value: Date, start: Date, end: Date): boolean {
    const timestamp = value.getTime();
    return timestamp >= start.getTime() && timestamp <= end.getTime();
  }

  private getCartByOrder(order: Order, cartsById: Map<string, Cart>): Cart | null {
    const cartObjectId = this.toObjectId(order.cartId);
    if (!cartObjectId) {
      return null;
    }

    return cartsById.get(cartObjectId.toHexString()) ?? null;
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
