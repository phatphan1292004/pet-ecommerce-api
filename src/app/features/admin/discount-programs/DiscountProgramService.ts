import { AppDataSource } from '@/app/database';
import { DiscountProgram, DiscountProgramDiscountType } from '@/app/entities/DiscountProgram';
import { Product } from '@/app/entities/Product';
import { BadRequestError, ConflictError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

type NumberInput = number | string;
type DateInput = Date | string;

export interface AdminDiscountProgramListQuery {
  search?: string;
  discountType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminCreateDiscountProgramPayload {
  name: string;
  code: string;
  discountType: DiscountProgramDiscountType | string;
  discountValue: NumberInput;
  startDate: DateInput;
  endDate: DateInput;
  isActive?: boolean;
  description?: string;
  productIds?: string[];
}

export interface AdminUpdateDiscountProgramPayload {
  name?: string;
  code?: string;
  discountType?: DiscountProgramDiscountType | string;
  discountValue?: NumberInput;
  startDate?: DateInput;
  endDate?: DateInput;
  isActive?: boolean;
  description?: string;
  productIds?: string[];
}

export interface AdminDiscountProgramResponse {
  id: string;
  name: string;
  code: string;
  discountType: DiscountProgramDiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  description: string | null;
  productIds: string[];
  productCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface AdminDiscountProgramListResponse {
  items: AdminDiscountProgramResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ProgramProductResponse {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  images: string[];
  isActive: boolean;
}

export interface ProgramProductListResponse {
  items: ProgramProductResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class AdminDiscountProgramService {
  private programRepo = AppDataSource.getMongoRepository(DiscountProgram);
  private productRepo = AppDataSource.getMongoRepository(Product);

  async getPrograms(query: AdminDiscountProgramListQuery = {}): Promise<AdminDiscountProgramListResponse> {
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

    const programs = await this.programRepo.find({ where });

    const normalizedSearch = query.search?.trim().toLowerCase();
    const filteredPrograms = normalizedSearch
      ? programs.filter((program) =>
          [program.name, program.code]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch)),
        )
      : programs;

    const sortedPrograms = filteredPrograms.sort((a, b) => this.getSortTimestamp(b) - this.getSortTimestamp(a));
    const totalItems = sortedPrograms.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pagedPrograms = sortedPrograms.slice(startIndex, startIndex + limit);

    return {
      items: pagedPrograms.map((program) => this.toProgramResponse(program)),
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

  async getProgramById(programId: string): Promise<AdminDiscountProgramResponse> {
    const program = await this.getProgramEntityById(programId);
    return this.toProgramResponse(program);
  }

  async createProgram(payload: AdminCreateDiscountProgramPayload): Promise<AdminDiscountProgramResponse> {
    this.validateCreatePayload(payload);

    const name = this.normalizeName(payload.name);
    const code = this.normalizeCode(payload.code);
    await this.ensureCodeUnique(code);

    const discountType = this.normalizeDiscountType(payload.discountType, 'discountType');
    const discountValue = this.parsePositiveNumber(payload.discountValue, 'discountValue');
    const startDate = this.parseDate(payload.startDate, 'startDate');
    const endDate = this.parseDate(payload.endDate, 'endDate');
    const isActive = payload.isActive ?? true;
    const description = this.parseDescription(payload.description);
    const productIds = payload.productIds ? await this.parseProductIds(payload.productIds) : [];

    this.validateDateRange(startDate, endDate);
    this.validateDiscountValue(discountType, discountValue);

    const program = this.programRepo.create({
      name,
      code,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive,
      description,
      productIds,
    });

    const savedProgram = await this.programRepo.save(program);
    return this.toProgramResponse(savedProgram);
  }

  async updateProgram(
    programId: string,
    payload: AdminUpdateDiscountProgramPayload,
  ): Promise<AdminDiscountProgramResponse> {
    const program = await this.getProgramEntityById(programId);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError('Update payload is required');
    }

    if (payload.name !== undefined) {
      program.name = this.normalizeName(payload.name);
    }

    if (payload.code !== undefined) {
      const code = this.normalizeCode(payload.code);
      await this.ensureCodeUnique(code, program._id.toHexString());
      program.code = code;
    }

    if (payload.discountType !== undefined) {
      program.discountType = this.normalizeDiscountType(payload.discountType, 'discountType');
    }

    if (payload.discountValue !== undefined) {
      program.discountValue = this.parsePositiveNumber(payload.discountValue, 'discountValue');
    }

    if (payload.startDate !== undefined) {
      program.startDate = this.parseDate(payload.startDate, 'startDate');
    }

    if (payload.endDate !== undefined) {
      program.endDate = this.parseDate(payload.endDate, 'endDate');
    }

    if (payload.isActive !== undefined) {
      if (typeof payload.isActive !== 'boolean') {
        throw new BadRequestError('isActive must be a boolean');
      }
      program.isActive = payload.isActive;
    }

    if (payload.description !== undefined) {
      program.description = this.parseDescription(payload.description);
    }

    if (payload.productIds !== undefined) {
      program.productIds = await this.parseProductIds(payload.productIds);
    }

    this.validateDateRange(program.startDate, program.endDate);
    this.validateDiscountValue(program.discountType, program.discountValue);

    const savedProgram = await this.programRepo.save(program);
    return this.toProgramResponse(savedProgram);
  }

  async deleteProgram(programId: string): Promise<void> {
    const objectId = this.parseObjectId(programId, 'programId');
    const result = await this.programRepo.deleteOne({ _id: objectId });

    if (!result.deletedCount) {
      throw new NotFoundError('Discount program not found');
    }
  }

  async addProducts(programId: string, productIds: string[]): Promise<AdminDiscountProgramResponse> {
    const program = await this.getProgramEntityById(programId);
    const incomingIds = await this.parseProductIds(productIds);

    const existingIds = (program.productIds ?? []).map((id) => id.toHexString());
    const mergedIds = new Set([...existingIds, ...incomingIds.map((id) => id.toHexString())]);

    program.productIds = Array.from(mergedIds).map((id) => new ObjectId(id));

    const savedProgram = await this.programRepo.save(program);
    return this.toProgramResponse(savedProgram);
  }

  async removeProducts(programId: string, productIds: string[]): Promise<AdminDiscountProgramResponse> {
    const program = await this.getProgramEntityById(programId);
    const removeIds = await this.parseProductIds(productIds);
    const removeSet = new Set(removeIds.map((id) => id.toHexString()));

    program.productIds = (program.productIds ?? []).filter((id) => !removeSet.has(id.toHexString()));

    const savedProgram = await this.programRepo.save(program);
    return this.toProgramResponse(savedProgram);
  }

  async getProgramProducts(
    programId: string,
    pageInput?: number,
    limitInput?: number,
  ): Promise<ProgramProductListResponse> {
    const program = await this.getProgramEntityById(programId);
    const productIds = program.productIds ?? [];

    const page = Number.isInteger(pageInput) && (pageInput as number) > 0 ? (pageInput as number) : 1;
    const limitRaw = Number.isInteger(limitInput) && (limitInput as number) > 0 ? (limitInput as number) : 20;
    const limit = Math.min(limitRaw, 50);

    const totalItems = productIds.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pagedIds = productIds.slice(startIndex, startIndex + limit);

    if (pagedIds.length === 0) {
      return {
        items: [],
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

    const products = await this.productRepo.find({ where: { _id: { $in: pagedIds } } });
    const productMap = new Map(products.map((product) => [product._id.toHexString(), product]));

    const orderedProducts = pagedIds
      .map((id) => productMap.get(id.toHexString()))
      .filter((product): product is Product => !!product);

    return {
      items: orderedProducts.map((product) => this.toProgramProductResponse(product)),
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

  private validateCreatePayload(payload: AdminCreateDiscountProgramPayload): void {
    if (!payload.name?.trim()) {
      throw new BadRequestError('name is required');
    }

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

  private async getProgramEntityById(programId: string): Promise<DiscountProgram> {
    const objectId = this.parseObjectId(programId, 'programId');
    const program = await this.programRepo.findOne({ where: { _id: objectId } });

    if (!program) {
      throw new NotFoundError('Discount program not found');
    }

    return program;
  }

  private async ensureCodeUnique(code: string, excludeProgramId?: string): Promise<void> {
    const existingProgram = await this.programRepo.findOne({ where: { code } });

    if (!existingProgram) {
      return;
    }

    if (!excludeProgramId || existingProgram._id.toHexString() !== excludeProgramId) {
      throw new ConflictError('code already exists');
    }
  }

  private normalizeName(name: string): string {
    const normalizedName = name?.trim();

    if (!normalizedName) {
      throw new BadRequestError('name is required');
    }

    return normalizedName;
  }

  private normalizeCode(code: string): string {
    const normalizedCode = code?.trim().toUpperCase();

    if (!normalizedCode) {
      throw new BadRequestError('code is required');
    }

    return normalizedCode;
  }

  private normalizeDiscountType(value: string, fieldName: string): DiscountProgramDiscountType {
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

  private async parseProductIds(productIds: string[]): Promise<ObjectId[]> {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new BadRequestError('productIds is required');
    }

    const normalizedIds = productIds
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean);

    if (normalizedIds.length === 0) {
      throw new BadRequestError('productIds is required');
    }

    const uniqueIds = Array.from(new Set(normalizedIds));
    const objectIds = uniqueIds.map((id) => this.parseObjectId(id, 'productId'));

    const products = await this.productRepo.find({ where: { _id: { $in: objectIds } } });
    const productIdSet = new Set(products.map((product) => product._id.toHexString()));

    const missingIds = uniqueIds.filter((id) => !productIdSet.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestError(`Products not found: ${missingIds.join(', ')}`);
    }

    return objectIds;
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestError('endDate must be greater than startDate');
    }
  }

  private validateDiscountValue(discountType: DiscountProgramDiscountType, discountValue: number): void {
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

  private toProgramResponse(program: DiscountProgram): AdminDiscountProgramResponse {
    const productIds = (program.productIds ?? []).map((id) => id.toHexString());

    return {
      id: program._id.toHexString(),
      name: program.name,
      code: program.code,
      discountType: program.discountType,
      discountValue: program.discountValue,
      startDate: program.startDate,
      endDate: program.endDate,
      isActive: program.isActive,
      description: program.description ?? null,
      productIds,
      productCount: productIds.length,
      createdAt: this.toValidDate(program.createdAt),
      updatedAt: this.toValidDate(program.updatedAt),
    };
  }

  private toProgramProductResponse(product: Product): ProgramProductResponse {
    return {
      id: product._id.toHexString(),
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      images: product.images,
      isActive: product.is_active,
    };
  }

  private getSortTimestamp(program: DiscountProgram): number {
    return this.toValidDate(program.createdAt)?.getTime() ?? this.toValidDate(program.startDate)?.getTime() ?? 0;
  }

  private toValidDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const dateValue = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }
}
