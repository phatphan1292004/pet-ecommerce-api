import { AppDataSource } from '@/app/database';
import { DiscountProgram, DiscountProgramDiscountType } from '@/app/entities/DiscountProgram';
import { Product } from '@/app/entities/Product';
import { NotFoundError } from '@/app/exceptions/AppError';

export interface GuestDiscountProgramResponse {
  id: string;
  name: string;
  code: string;
  discountType: DiscountProgramDiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  description: string | null;
  productCount: number;
}

export interface GuestProgramProductResponse {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  images: string[];
}

export interface GuestProgramProductListResponse {
  items: GuestProgramProductResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GuestDiscountProgramWithProductsResponse {
  program: GuestDiscountProgramResponse;
  products: GuestProgramProductListResponse;
}

export class GuestDiscountProgramService {
  private programRepo = AppDataSource.getMongoRepository(DiscountProgram);
  private productRepo = AppDataSource.getMongoRepository(Product);

  async getActiveProgramWithProducts(
    pageInput?: number,
    limitInput?: number,
  ): Promise<GuestDiscountProgramWithProductsResponse> {
    const program = await this.getLatestActiveProgramEntity();
    const products = await this.buildProgramProducts(program, pageInput, limitInput);

    return {
      program: this.toProgramResponse(program),
      products,
    };
  }

  private async getLatestActiveProgramEntity(): Promise<DiscountProgram> {
    const now = new Date();
    const programs = await this.programRepo.find({ where: { isActive: true } });

    const activePrograms = programs.filter((program) => {
      if (!program.startDate || !program.endDate) {
        return false;
      }

      const startDate = new Date(program.startDate);
      const endDate = new Date(program.endDate);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return false;
      }

      if (now.getTime() < startDate.getTime()) {
        return false;
      }

      if (now.getTime() > endDate.getTime()) {
        return false;
      }

      return true;
    });

    if (activePrograms.length === 0) {
      throw new NotFoundError('Discount program not found');
    }

    const sortedPrograms = activePrograms.sort((a, b) => this.getSortTimestamp(b) - this.getSortTimestamp(a));
    return sortedPrograms[0];
  }

  private toProgramResponse(program: DiscountProgram): GuestDiscountProgramResponse {
    return {
      id: program._id.toHexString(),
      name: program.name,
      code: program.code,
      discountType: program.discountType,
      discountValue: program.discountValue,
      startDate: program.startDate,
      endDate: program.endDate,
      description: program.description ?? null,
      productCount: (program.productIds ?? []).length,
    };
  }

  private toProgramProductResponse(product: Product): GuestProgramProductResponse {
    return {
      id: product._id.toHexString(),
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      images: product.images,
    };
  }

  private async buildProgramProducts(
    program: DiscountProgram,
    pageInput?: number,
    limitInput?: number,
  ): Promise<GuestProgramProductListResponse> {
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

    const products = await this.productRepo.find({ where: { _id: { $in: pagedIds }, is_active: true } });
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

  private getSortTimestamp(program: DiscountProgram): number {
    const createdAt = program.createdAt instanceof Date ? program.createdAt : new Date(program.createdAt as any);
    const startDate = program.startDate instanceof Date ? program.startDate : new Date(program.startDate as any);

    if (!Number.isNaN(createdAt.getTime())) {
      return createdAt.getTime();
    }

    return Number.isNaN(startDate.getTime()) ? 0 : startDate.getTime();
  }
}
