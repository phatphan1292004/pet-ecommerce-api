import { AppDataSource } from '@/app/database';
import { Coupon, CouponDiscountType } from '@/app/entities/Coupon';
import { BadRequestError, ConflictError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

type NumberInput = number | string;
type DateInput = Date | string;

export interface AdminCouponListQuery {
  code?: string;
  discountType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminCreateCouponPayload {
  code: string;
  discountType: CouponDiscountType | string;
  discountValue: NumberInput;
  minOrderValue?: NumberInput;
  maxDiscount?: NumberInput | null;
  usageLimit?: NumberInput | null;
  usedCount?: NumberInput;
  startDate: DateInput;
  endDate: DateInput;
  isActive?: boolean;
  description?: string;
}

export interface AdminUpdateCouponPayload {
  code?: string;
  discountType?: CouponDiscountType | string;
  discountValue?: NumberInput;
  minOrderValue?: NumberInput;
  maxDiscount?: NumberInput | null;
  usageLimit?: NumberInput | null;
  usedCount?: NumberInput;
  startDate?: DateInput;
  endDate?: DateInput;
  isActive?: boolean;
  description?: string;
}

export interface AdminCouponResponse {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface AdminCouponListResponse {
  items: AdminCouponResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class AdminCouponService {
  private couponRepo = AppDataSource.getMongoRepository(Coupon);

  async getCoupons(query: AdminCouponListQuery = {}): Promise<AdminCouponListResponse> {
    const where: Record<string, unknown> = {};

    if (query.discountType?.trim()) {
      where.discountType = this.normalizeDiscountType(query.discountType, 'discountType');
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
    const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 10;
    const limit = Math.min(limitRaw, 50);

    const coupons = await this.couponRepo.find({ where });
    const normalizedCode = query.code?.trim().toUpperCase();

    const filteredCoupons = normalizedCode
      ? coupons.filter((coupon) => coupon.code.toUpperCase().includes(normalizedCode))
      : coupons;

    const sortedCoupons = filteredCoupons.sort((a, b) => this.getSortTimestamp(b) - this.getSortTimestamp(a));
    const totalItems = sortedCoupons.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const pagedCoupons = sortedCoupons.slice(startIndex, startIndex + limit);

    return {
      items: pagedCoupons.map((coupon) => this.toCouponResponse(coupon)),
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

  async getCouponById(couponId: string): Promise<AdminCouponResponse> {
    const coupon = await this.getCouponEntityById(couponId);
    return this.toCouponResponse(coupon);
  }

  async createCoupon(payload: AdminCreateCouponPayload): Promise<AdminCouponResponse> {
    this.validateCreatePayload(payload);

    const code = this.normalizeCode(payload.code);
    await this.ensureCodeUnique(code);

    const discountType = this.normalizeDiscountType(payload.discountType, 'discountType');
    const discountValue = this.parsePositiveNumber(payload.discountValue, 'discountValue');
    const minOrderValue =
      payload.minOrderValue === undefined
        ? 0
        : this.parseNonNegativeNumber(payload.minOrderValue, 'minOrderValue');
    const maxDiscount = this.parseNullablePositiveNumber(payload.maxDiscount, 'maxDiscount');
    const usageLimit = this.parseNullablePositiveInteger(payload.usageLimit, 'usageLimit');
    const usedCount =
      payload.usedCount === undefined ? 0 : this.parseNonNegativeInteger(payload.usedCount, 'usedCount');
    const startDate = this.parseDate(payload.startDate, 'startDate');
    const endDate = this.parseDate(payload.endDate, 'endDate');
    const isActive = payload.isActive ?? true;
    const description = this.parseDescription(payload.description);

    this.validateDateRange(startDate, endDate);
    this.validateDiscountValue(discountType, discountValue);

    if (usageLimit !== undefined && usedCount > usageLimit) {
      throw new BadRequestError('usedCount cannot be greater than usageLimit');
    }

    const coupon = this.couponRepo.create({
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      usedCount,
      startDate,
      endDate,
      isActive,
      description,
    });

    const savedCoupon = await this.couponRepo.save(coupon);
    return this.toCouponResponse(savedCoupon);
  }

  async updateCoupon(couponId: string, payload: AdminUpdateCouponPayload): Promise<AdminCouponResponse> {
    const coupon = await this.getCouponEntityById(couponId);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError('Update payload is required');
    }

    if (payload.code !== undefined) {
      const code = this.normalizeCode(payload.code);
      await this.ensureCodeUnique(code, coupon._id.toHexString());
      coupon.code = code;
    }

    if (payload.discountType !== undefined) {
      coupon.discountType = this.normalizeDiscountType(payload.discountType, 'discountType');
    }

    if (payload.discountValue !== undefined) {
      coupon.discountValue = this.parsePositiveNumber(payload.discountValue, 'discountValue');
    }

    if (payload.minOrderValue !== undefined) {
      coupon.minOrderValue = this.parseNonNegativeNumber(payload.minOrderValue, 'minOrderValue');
    }

    if (payload.maxDiscount !== undefined) {
      coupon.maxDiscount = this.parseNullablePositiveNumber(payload.maxDiscount, 'maxDiscount');
    }

    if (payload.usageLimit !== undefined) {
      coupon.usageLimit = this.parseNullablePositiveInteger(payload.usageLimit, 'usageLimit');
    }

    if (payload.usedCount !== undefined) {
      coupon.usedCount = this.parseNonNegativeInteger(payload.usedCount, 'usedCount');
    }

    if (payload.startDate !== undefined) {
      coupon.startDate = this.parseDate(payload.startDate, 'startDate');
    }

    if (payload.endDate !== undefined) {
      coupon.endDate = this.parseDate(payload.endDate, 'endDate');
    }

    if (payload.isActive !== undefined) {
      if (typeof payload.isActive !== 'boolean') {
        throw new BadRequestError('isActive must be a boolean');
      }
      coupon.isActive = payload.isActive;
    }

    if (payload.description !== undefined) {
      coupon.description = this.parseDescription(payload.description);
    }

    this.validateDateRange(coupon.startDate, coupon.endDate);
    this.validateDiscountValue(coupon.discountType, coupon.discountValue);

    if (coupon.usageLimit !== undefined && coupon.usedCount > coupon.usageLimit) {
      throw new BadRequestError('usedCount cannot be greater than usageLimit');
    }

    const savedCoupon = await this.couponRepo.save(coupon);
    return this.toCouponResponse(savedCoupon);
  }

  async deleteCoupon(couponId: string): Promise<void> {
    const objectId = this.parseObjectId(couponId, 'couponId');
    const result = await this.couponRepo.deleteOne({ _id: objectId });

    if (!result.deletedCount) {
      throw new NotFoundError('Coupon not found');
    }
  }

  private validateCreatePayload(payload: AdminCreateCouponPayload): void {
    if (!payload.code?.trim()) {
      throw new BadRequestError('code is required');
    }

    this.normalizeDiscountType(payload.discountType, 'discountType');
    this.parsePositiveNumber(payload.discountValue, 'discountValue');

    if (payload.startDate === undefined) {
      throw new BadRequestError('startDate is required');
    }

    if (payload.endDate === undefined) {
      throw new BadRequestError('endDate is required');
    }
  }

  private async getCouponEntityById(couponId: string): Promise<Coupon> {
    const objectId = this.parseObjectId(couponId, 'couponId');
    const coupon = await this.couponRepo.findOne({ where: { _id: objectId } });

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    return coupon;
  }

  private async ensureCodeUnique(code: string, excludeCouponId?: string): Promise<void> {
    const existingCoupon = await this.couponRepo.findOne({ where: { code } });

    if (!existingCoupon) {
      return;
    }

    if (!excludeCouponId || existingCoupon._id.toHexString() !== excludeCouponId) {
      throw new ConflictError('code already exists');
    }
  }

  private normalizeCode(code: string): string {
    const normalizedCode = code?.trim().toUpperCase();

    if (!normalizedCode) {
      throw new BadRequestError('code is required');
    }

    return normalizedCode;
  }

  private normalizeDiscountType(value: string, fieldName: string): CouponDiscountType {
    const normalizedValue = value?.trim().toUpperCase();

    if (!normalizedValue) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    if (normalizedValue !== 'PERCENT' && normalizedValue !== 'FIXED') {
      throw new BadRequestError(`${fieldName} must be PERCENT or FIXED`);
    }

    return normalizedValue;
  }

  private parsePositiveNumber(value: NumberInput, fieldName: string): number {
    const parsedValue = this.parseNumber(value, fieldName);

    if (parsedValue <= 0) {
      throw new BadRequestError(`${fieldName} must be greater than 0`);
    }

    return parsedValue;
  }

  private parseNonNegativeNumber(value: NumberInput, fieldName: string): number {
    const parsedValue = this.parseNumber(value, fieldName);

    if (parsedValue < 0) {
      throw new BadRequestError(`${fieldName} must be greater than or equal to 0`);
    }

    return parsedValue;
  }

  private parseNullablePositiveNumber(value: NumberInput | null | undefined, fieldName: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string' && !value.trim()) {
      return undefined;
    }

    return this.parsePositiveNumber(value, fieldName);
  }

  private parseNonNegativeInteger(value: NumberInput, fieldName: string): number {
    const parsedValue = this.parseNonNegativeNumber(value, fieldName);

    if (!Number.isInteger(parsedValue)) {
      throw new BadRequestError(`${fieldName} must be an integer`);
    }

    return parsedValue;
  }

  private parseNullablePositiveInteger(value: NumberInput | null | undefined, fieldName: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string' && !value.trim()) {
      return undefined;
    }

    const parsedValue = this.parsePositiveNumber(value, fieldName);

    if (!Number.isInteger(parsedValue)) {
      throw new BadRequestError(`${fieldName} must be an integer`);
    }

    return parsedValue;
  }

  private parseNumber(value: NumberInput, fieldName: string): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsedValue)) {
      throw new BadRequestError(`${fieldName} is invalid`);
    }

    return parsedValue;
  }

  private parseDate(value: DateInput, fieldName: string): Date {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestError(`${fieldName} is invalid`);
      }

      return value;
    }

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      throw new BadRequestError(`${fieldName} is invalid`);
    }

    return dateValue;
  }

  private parseDescription(description?: string): string | undefined {
    if (description === undefined) {
      return undefined;
    }

    const normalizedDescription = description.trim();
    return normalizedDescription || undefined;
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestError('endDate must be greater than startDate');
    }
  }

  private validateDiscountValue(discountType: CouponDiscountType, discountValue: number): void {
    if (discountType === 'PERCENT' && discountValue > 100) {
      throw new BadRequestError('discountValue for PERCENT must be less than or equal to 100');
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

  private toCouponResponse(coupon: Coupon): AdminCouponResponse {
    return {
      id: coupon._id.toHexString(),
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount ?? null,
      usageLimit: coupon.usageLimit ?? null,
      usedCount: coupon.usedCount,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isActive: coupon.isActive,
      description: coupon.description ?? null,
      createdAt: this.toValidDate(coupon.createdAt),
      updatedAt: this.toValidDate(coupon.updatedAt),
    };
  }

  private getSortTimestamp(coupon: Coupon): number {
    return this.toValidDate(coupon.createdAt)?.getTime() ?? this.toValidDate(coupon.startDate)?.getTime() ?? 0;
  }

  private toValidDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const dateValue = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }
}