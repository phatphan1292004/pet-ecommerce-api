import { AppDataSource } from '../../../database';
import { Category, SubCategory } from '../../../entities/Categories';
import { NotFoundError } from '../../../exceptions/AppError';
import { ObjectId } from 'mongodb';

export class CategoryService {
  private repo = AppDataSource.getMongoRepository(Category);

  /**
   * Get all active categories
   */
  async getAllCategories(): Promise<Partial<Category>[]> {
    const categories = await this.repo.find({
      where: { is_active: true },
      order: { level: 'ASC', created_at: 'DESC' }
    });

    // Return only category info without subcategories
    return categories.map(({ _id, name, slug, icon, level, is_active, created_at }) => ({
      _id,
      name,
      slug,
      icon,
      level,
      is_active,
      created_at
    }));
  }

  /**
   * Get subcategories by category ID
   */
  async getSubcategoriesByCategoryId(categoryId: string): Promise<SubCategory[]> {
    // Validate ObjectId format
    if (!ObjectId.isValid(categoryId)) {
      throw new NotFoundError('Invalid category ID format');
    }

    const category = await this.repo.findOne({
      where: { _id: new ObjectId(categoryId) }
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Filter active subcategories
    const activeSubcategories = category.subcategories?.filter(
      sub => sub.is_active
    ) || [];

    return activeSubcategories;
  }
}
