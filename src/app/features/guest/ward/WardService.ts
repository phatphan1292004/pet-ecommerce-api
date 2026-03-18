import { AppDataSource } from '@/app/database';
import { Ward } from '@/app/entities/Ward';
import { BadRequestError } from '@/app/exceptions/AppError';

export interface WardResponse {
  _id: Ward['_id'];
  wardId: string;
  wardCode: string;
  name: string;
  provinceId: number;
  createdAt: Date;
  updatedAt: Date;
}

export class WardService {
  private repo = AppDataSource.getMongoRepository(Ward);

  async getWardsByProvinceId(provinceIdParam: string): Promise<WardResponse[]> {
    const provinceId = Number(provinceIdParam);

    if (!Number.isInteger(provinceId) || provinceId <= 0) {
      throw new BadRequestError('provinceId must be a positive integer');
    }

    const wards = await this.repo.find({
      where: { provinceId },
      order: { wardCode: 'ASC' }
    });

    return wards.map(this.toWardResponse);
  }

  private toWardResponse(ward: Ward): WardResponse {
    return {
      _id: ward._id,
      wardId: ward.wardId,
      wardCode: ward.wardCode,
      name: ward.name,
      provinceId: ward.provinceId,
      createdAt: ward.createdAt,
      updatedAt: ward.updatedAt
    };
  }
}