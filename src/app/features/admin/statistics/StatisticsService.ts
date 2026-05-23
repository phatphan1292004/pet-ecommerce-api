import { AppDataSource } from '@/app/database';
import { Cart } from '@/app/entities/Cart';
import { Customer } from '@/app/entities/Customer';
import { Order } from '@/app/entities/Order';
import { Product } from '@/app/entities/Product';
import { ObjectId } from 'mongodb';

const VN_TIMEZONE_OFFSET_MINUTES = 7 * 60;
const DELIVERED_STATUS = 'delivered';
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'failed']);

interface RevenueSeriesItem {
  date: string;
  revenue: number;
  orders: number;
}

interface ProductStatItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  quantity: number;
  revenue: number;
}

interface ProductStockItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  stock: number;
}

interface CustomerSpendItem {
  id: string;
  name: string;
  totalSpent: number;
  orders: number;
}

export interface AdminStatisticsResponse {
  revenue: {
    today: number;
    month: number;
    year: number;
    series: {
      last7Days: RevenueSeriesItem[];
      last30Days: RevenueSeriesItem[];
      last6Months: RevenueSeriesItem[];
      last12Months: RevenueSeriesItem[];
    };
  };
  orders: {
    total: number;
    pending: number;
    delivering: number;
    delivered: number;
    cancelled: number;
    cancellationRate: number;
  };
  products: {
    topSelling: ProductStatItem[];
    topRevenue: ProductStatItem[];
    lowStock: ProductStockItem[];
    highStock: ProductStockItem[];
    lowSelling: ProductStatItem[];
  };
  customers: {
    total: number;
    newToday: number;
    newThisMonth: number;
    newThisYear: number;
    returning: number;
    topSpenders: CustomerSpendItem[];
    newCustomersSeriesLast30Days: RevenueSeriesItem[];
  };
}

export class AdminStatisticsService {
  private orderRepo = AppDataSource.getMongoRepository(Order);
  private cartRepo = AppDataSource.getMongoRepository(Cart);
  private customerRepo = AppDataSource.getMongoRepository(Customer);
  private productRepo = AppDataSource.getMongoRepository(Product);

  async getStatistics(): Promise<AdminStatisticsResponse> {
    const [orders, customers, products] = await Promise.all([
      this.orderRepo.find(),
      this.customerRepo.find(),
      this.productRepo.find(),
    ]);

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
    const productsById = new Map(products.map((product) => [product._id.toHexString(), product]));

    const nowVn = this.toVnDate(new Date());
    const todayRange = this.getVnDayRange(nowVn);
    const monthRange = this.getVnMonthRange(nowVn);
    const yearRange = this.getVnYearRange(nowVn);

    const deliveredOrders = orders.filter((order) => order.status === DELIVERED_STATUS);

    const revenueToday = this.sumRevenueInRange(deliveredOrders, cartsById, todayRange);
    const revenueMonth = this.sumRevenueInRange(deliveredOrders, cartsById, monthRange);
    const revenueYear = this.sumRevenueInRange(deliveredOrders, cartsById, yearRange);

    const revenueSeries7Days = this.buildDailySeries(deliveredOrders, cartsById, 7);
    const revenueSeries30Days = this.buildDailySeries(deliveredOrders, cartsById, 30);
    const revenueSeries6Months = this.buildMonthlySeries(deliveredOrders, cartsById, 6);
    const revenueSeries12Months = this.buildMonthlySeries(deliveredOrders, cartsById, 12);

    const orderStats = this.buildOrderStats(orders);
    const productStats = this.buildProductStats(deliveredOrders, cartsById, productsById, products);
    const customerStats = this.buildCustomerStats(orders, customers, deliveredOrders, cartsById);

    return {
      revenue: {
        today: revenueToday,
        month: revenueMonth,
        year: revenueYear,
        series: {
          last7Days: revenueSeries7Days,
          last30Days: revenueSeries30Days,
          last6Months: revenueSeries6Months,
          last12Months: revenueSeries12Months,
        },
      },
      orders: orderStats,
      products: productStats,
      customers: customerStats,
    };
  }

  private buildOrderStats(orders: Order[]): AdminStatisticsResponse['orders'] {
    const total = orders.length;
    const pending = orders.filter((order) => order.status === 'pending').length;
    const delivering = orders.filter((order) => order.status === 'delivering').length;
    const delivered = orders.filter((order) => order.status === DELIVERED_STATUS).length;
    const cancelled = orders.filter((order) => CANCELLED_STATUSES.has(order.status)).length;
    const cancellationRate = total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0;

    return {
      total,
      pending,
      delivering,
      delivered,
      cancelled,
      cancellationRate,
    };
  }

  private buildProductStats(
    deliveredOrders: Order[],
    cartsById: Map<string, Cart>,
    productsById: Map<string, Product>,
    products: Product[],
  ): AdminStatisticsResponse['products'] {
    const productTotals = this.buildProductTotals(deliveredOrders, cartsById);
    const recentRange = this.getVnRangeForLastDays(30);
    const recentOrders = deliveredOrders.filter((order) => this.isInRange(order.createdAt, recentRange));
    const recentTotals = this.buildProductTotals(recentOrders, cartsById);

    const productStats = [...productTotals.entries()].map(([productId, totals]) => {
      const product = productsById.get(productId);
      return {
        id: productId,
        name: product?.name ?? 'Unknown',
        slug: product?.slug ?? '',
        image: product?.images?.[0] ?? '',
        quantity: totals.quantity,
        revenue: totals.revenue,
      };
    });

    const topSelling = [...productStats]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topRevenue = [...productStats]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const lowStock = products
      .filter((product) => product.is_active && product.stock <= 5)
      .map((product) => this.toProductStockItem(product))
      .slice(0, 10);

    const highStock = products
      .filter((product) => product.is_active && product.stock >= 100)
      .sort((a, b) => b.stock - a.stock)
      .map((product) => this.toProductStockItem(product))
      .slice(0, 10);

    const lowSelling = this.buildLowSellingProducts(products, recentTotals);

    return {
      topSelling,
      topRevenue,
      lowStock,
      highStock,
      lowSelling,
    };
  }

  private buildLowSellingProducts(
    products: Product[],
    totals: Map<string, { quantity: number; revenue: number }>,
  ): ProductStatItem[] {
    const items = products
      .filter((product) => product.is_active)
      .map((product) => {
        const totalsForProduct = totals.get(product._id.toHexString()) ?? { quantity: 0, revenue: 0 };
        return {
          id: product._id.toHexString(),
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] ?? '',
          quantity: totalsForProduct.quantity,
          revenue: totalsForProduct.revenue,
        };
      })
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10);

    return items;
  }

  private buildProductTotals(
    orders: Order[],
    cartsById: Map<string, Cart>,
  ): Map<string, { quantity: number; revenue: number }> {
    const totals = new Map<string, { quantity: number; revenue: number }>();

    for (const order of orders) {
      const cart = this.getCartByOrder(order, cartsById);
      if (!cart?.products?.length) {
        continue;
      }

      for (const item of cart.products) {
        const productId = item.productId?.trim();
        if (!productId) {
          continue;
        }

        const current = totals.get(productId) ?? { quantity: 0, revenue: 0 };
        const quantity = Number(item.quantity) || 0;
        const revenue = (Number(item.price) || 0) * quantity;
        totals.set(productId, {
          quantity: current.quantity + quantity,
          revenue: current.revenue + revenue,
        });
      }
    }

    return totals;
  }

  private buildCustomerStats(
    orders: Order[],
    customers: Customer[],
    deliveredOrders: Order[],
    cartsById: Map<string, Cart>,
  ): AdminStatisticsResponse['customers'] {
    const nowVn = this.toVnDate(new Date());
    const todayRange = this.getVnDayRange(nowVn);
    const monthRange = this.getVnMonthRange(nowVn);
    const yearRange = this.getVnYearRange(nowVn);

    const newToday = customers.filter((user) => this.isInRange(user.createdAt, todayRange)).length;
    const newThisMonth = customers.filter((user) => this.isInRange(user.createdAt, monthRange)).length;
    const newThisYear = customers.filter((user) => this.isInRange(user.createdAt, yearRange)).length;

    const orderCountByCustomer = new Map<string, number>();
    for (const order of orders) {
      const customerId = order.customerId?.trim();
      if (!customerId) {
        continue;
      }
      orderCountByCustomer.set(customerId, (orderCountByCustomer.get(customerId) ?? 0) + 1);
    }

    const returning = [...orderCountByCustomer.values()].filter((count) => count >= 2).length;

    const spendByCustomer = new Map<string, { total: number; orders: number }>();
    for (const order of deliveredOrders) {
      const customerId = order.customerId?.trim();
      if (!customerId) {
        continue;
      }

      const cart = this.getCartByOrder(order, cartsById);
      const value = cart?.finalPrice ?? 0;
      const current = spendByCustomer.get(customerId) ?? { total: 0, orders: 0 };
      spendByCustomer.set(customerId, {
        total: current.total + value,
        orders: current.orders + 1,
      });
    }

    const customerById = new Map(customers.map((customer) => [customer.firebaseUid, customer]));
    const topSpenders = [...spendByCustomer.entries()]
      .map(([customerId, stats]) => {
        const customer = customerById.get(customerId);
        return {
          id: customerId,
          name: customer?.displayName ?? 'Unknown',
          totalSpent: stats.total,
          orders: stats.orders,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const newCustomersSeriesLast30Days = this.buildCustomerDailySeries(customers, 30);

    return {
      total: customers.length,
      newToday,
      newThisMonth,
      newThisYear,
      returning,
      topSpenders,
      newCustomersSeriesLast30Days,
    };
  }

  private sumRevenueInRange(
    orders: Order[],
    cartsById: Map<string, Cart>,
    range: { start: Date; end: Date },
  ): number {
    return orders
      .filter((order) => this.isInRange(order.createdAt, range))
      .reduce((sum, order) => {
        const cart = this.getCartByOrder(order, cartsById);
        return sum + (cart?.finalPrice ?? 0);
      }, 0);
  }

  private buildDailySeries(
    orders: Order[],
    cartsById: Map<string, Cart>,
    days: number,
  ): RevenueSeriesItem[] {
    const items: RevenueSeriesItem[] = [];
    const safeDays = Math.max(1, Math.min(days, 365));

    for (let dayOffset = safeDays - 1; dayOffset >= 0; dayOffset -= 1) {
      const date = this.toVnDate(new Date());
      date.setDate(date.getDate() - dayOffset);
      const range = this.getVnDayRange(date);
      const revenue = this.sumRevenueInRange(orders, cartsById, range);
      const ordersCount = orders.filter((order) => this.isInRange(order.createdAt, range)).length;

      items.push({
        date: this.formatVnDate(range.start),
        revenue,
        orders: ordersCount,
      });
    }

    return items;
  }

  private buildMonthlySeries(
    orders: Order[],
    cartsById: Map<string, Cart>,
    months: number,
  ): RevenueSeriesItem[] {
    const items: RevenueSeriesItem[] = [];
    const safeMonths = Math.max(1, Math.min(months, 24));

    for (let monthOffset = safeMonths - 1; monthOffset >= 0; monthOffset -= 1) {
      const date = this.toVnDate(new Date());
      date.setMonth(date.getMonth() - monthOffset, 1);
      const range = this.getVnMonthRange(date);
      const revenue = this.sumRevenueInRange(orders, cartsById, range);
      const ordersCount = orders.filter((order) => this.isInRange(order.createdAt, range)).length;

      items.push({
        date: this.formatVnMonth(range.start),
        revenue,
        orders: ordersCount,
      });
    }

    return items;
  }

  private buildCustomerDailySeries(customers: Customer[], days: number): RevenueSeriesItem[] {
    const items: RevenueSeriesItem[] = [];
    const safeDays = Math.max(1, Math.min(days, 365));

    for (let dayOffset = safeDays - 1; dayOffset >= 0; dayOffset -= 1) {
      const date = this.toVnDate(new Date());
      date.setDate(date.getDate() - dayOffset);
      const range = this.getVnDayRange(date);
      const count = customers.filter((customer) => this.isInRange(customer.createdAt, range)).length;

      items.push({
        date: this.formatVnDate(range.start),
        revenue: count,
        orders: 0,
      });
    }

    return items;
  }

  private toProductStockItem(product: Product): ProductStockItem {
    return {
      id: product._id.toHexString(),
      name: product.name,
      slug: product.slug,
      image: product.images?.[0] ?? '',
      stock: product.stock,
    };
  }

  private toVnDate(date: Date): Date {
    return new Date(date.getTime() + VN_TIMEZONE_OFFSET_MINUTES * 60000);
  }

  private toUtcDate(date: Date): Date {
    return new Date(date.getTime() - VN_TIMEZONE_OFFSET_MINUTES * 60000);
  }

  private getVnDayRange(dateVn: Date): { start: Date; end: Date } {
    const startVn = new Date(dateVn);
    startVn.setHours(0, 0, 0, 0);
    const endVn = new Date(dateVn);
    endVn.setHours(23, 59, 59, 999);

    return { start: this.toUtcDate(startVn), end: this.toUtcDate(endVn) };
  }

  private getVnMonthRange(dateVn: Date): { start: Date; end: Date } {
    const startVn = new Date(dateVn.getFullYear(), dateVn.getMonth(), 1, 0, 0, 0, 0);
    const endVn = new Date(dateVn.getFullYear(), dateVn.getMonth() + 1, 0, 23, 59, 59, 999);

    return { start: this.toUtcDate(startVn), end: this.toUtcDate(endVn) };
  }

  private getVnYearRange(dateVn: Date): { start: Date; end: Date } {
    const startVn = new Date(dateVn.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endVn = new Date(dateVn.getFullYear(), 11, 31, 23, 59, 59, 999);

    return { start: this.toUtcDate(startVn), end: this.toUtcDate(endVn) };
  }

  private getVnRangeForLastDays(days: number): { start: Date; end: Date } {
    const safeDays = Math.max(1, days);
    const todayVn = this.toVnDate(new Date());
    const startVn = new Date(todayVn);
    startVn.setDate(startVn.getDate() - (safeDays - 1));
    startVn.setHours(0, 0, 0, 0);

    const endVn = new Date(todayVn);
    endVn.setHours(23, 59, 59, 999);

    return { start: this.toUtcDate(startVn), end: this.toUtcDate(endVn) };
  }

  private isInRange(value: Date, range: { start: Date; end: Date }): boolean {
    const timestamp = value.getTime();
    return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
  }

  private formatVnDate(dateUtc: Date): string {
    const vnDate = this.toVnDate(dateUtc);
    const year = vnDate.getFullYear();
    const month = String(vnDate.getMonth() + 1).padStart(2, '0');
    const day = String(vnDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatVnMonth(dateUtc: Date): string {
    const vnDate = this.toVnDate(dateUtc);
    const year = vnDate.getFullYear();
    const month = String(vnDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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
