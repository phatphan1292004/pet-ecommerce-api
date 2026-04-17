import { AppDataSource } from '@/app/database';
import { Coupon } from '@/app/entities/Coupon';

export interface GuestCouponListQuery {
  code?: string;
  page?: number;
  limit?: number;
}

export interface GuestCouponResponse {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  description: string | null;
  startDate: Date;
  endDate: Date;
}

export interface GuestCouponListResponse {
  items: GuestCouponResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class GuestCouponService {
  private couponRepo = AppDataSource.getMongoRepository(Coupon);

  async getAvailableCoupons(query: GuestCouponListQuery = {}): Promise<GuestCouponListResponse> {
    const now = new Date();

    const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
    const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 10;
    const limit = Math.min(limitRaw, 50);

    const coupons = await this.couponRepo.find({ where: { isActive: true } });

    const filtered = coupons.filter((c) => {
      if (!c.startDate || !c.endDate) return false;
      if (now.getTime() < new Date(c.startDate).getTime()) return false;
      if (now.getTime() > new Date(c.endDate).getTime()) return false;

      if (c.usageLimit !== undefined && c.usageLimit !== null) {
        if (c.usedCount >= c.usageLimit) return false;
      }

      return true;
    });

    const normalizedCode = query.code?.trim().toUpperCase();
    const filteredByCode = normalizedCode
      ? filtered.filter((c) => c.code.toUpperCase().includes(normalizedCode))
      : filtered;

    const sorted = filteredByCode.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paged = sorted.slice(startIndex, startIndex + limit);

    return {
      items: paged.map((c) => ({
        id: c._id.toHexString(),
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount ?? null,
        description: c.description ?? null,
        startDate: c.startDate,
        endDate: c.endDate,
      })),
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
}
