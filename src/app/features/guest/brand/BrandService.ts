import { AppDataSource } from '@/app/database';
import { Category, SubCategory } from '@/app/entities/Categories';

export interface BrandResponse {
  _id: SubCategory['_id'];
  name: string;
  slug: string;
  icon: string;
}

export class BrandService {
  private repo = AppDataSource.getMongoRepository(Category);

  async getAllBrands(): Promise<BrandResponse[]> {
    const brandCategory = await this.repo.findOne({
      where: {
        slug: 'nhan-hang',
        is_active: true
      }
    });

    if (!brandCategory?.subcategories?.length) {
      return [];
    }

    return brandCategory.subcategories
      .filter((subcategory) => subcategory.is_active)
      .map((subcategory) => ({
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        icon: subcategory.icon
      }));
  }
}