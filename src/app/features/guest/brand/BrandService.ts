import { AppDataSource } from '../../../database';
import { Brand } from '../../../entities/Brand';

export interface BrandResponse {
  _id: Brand['_id'];
  name: string;
  slug: string;
  icon: string;
}

export class BrandService {
  private repo = AppDataSource.getMongoRepository(Brand);

  async getAllBrands(): Promise<BrandResponse[]> {
    const brands = await this.repo.find({
      where: {
        is_active: true
      }
    });

    return brands.map((brand) => ({
      _id: brand._id,
      name: brand.name,
      slug: brand.slug,
      icon: brand.icon
    }));
  }
}