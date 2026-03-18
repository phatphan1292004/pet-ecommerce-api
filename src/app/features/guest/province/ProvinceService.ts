import { AppDataSource } from '@/app/database';
import { Province } from '@/app/entities/Province';

export interface ProvinceResponse {
  _id: Province['_id'];
  provinceId: number;
  provinceCode: string;
  name: string;
  countryId: number;
}

export class ProvinceService {
  private repo = AppDataSource.getMongoRepository(Province);

  async getAllProvinces(): Promise<ProvinceResponse[]> {
    const provinces = await this.repo.find({
      order: { provinceId: 'ASC' }
    });

    return provinces.map(this.toProvinceResponse);
  }

  private toProvinceResponse(province: Province): ProvinceResponse {
    return {
      _id: province._id,
      provinceId: province.provinceId,
      provinceCode: province.provinceCode,
      name: province.name,
      countryId: province.countryId
    };
  }
}