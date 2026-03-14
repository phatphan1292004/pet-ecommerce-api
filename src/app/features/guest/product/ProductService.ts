import { AppDataSource } from '@/app/database';
import { Product } from '@/app/entities/Product';
import { NotFoundError, BadRequestError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface ProductResponse {
  _id: ObjectId;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  discount: number;
  review: number;
  image: string;
}

export interface ProductDetailResponse extends ProductResponse {
  brand: string;
  description: string;
  longDescription: string;
  images: string[];
  stock: number;
  shipping: string;
  is_active: boolean;
  specifications: any;
  benefits: any;
  created_at: Date;
}

export class ProductService {
  private repo = AppDataSource.getMongoRepository(Product);

  /**
   * Get 10 latest active products
   */
  async getLatestProducts(): Promise<ProductResponse[]> {
    const products = await this.repo.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
      take: 10
    });

    return products.map(this.toProductResponse);
  }

  /**
   * Get product detail by slug
   */
  async getProductBySlug(slug: string): Promise<ProductDetailResponse> {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestError('Slug cannot be empty');
    }

    const product = await this.repo.findOne({
      where: { slug: slug, is_active: true }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.toProductDetailResponse(product);
  }

  // Helper methods

  /**
   * Map Product entity to ProductResponse
   */
  private toProductResponse(product: Product): ProductResponse {
    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      review: product.review,
      image: product.images && product.images.length > 0 ? product.images[0] : ''
    };
  }

  /**
   * Map Product entity to ProductDetailResponse
   */
  private toProductDetailResponse(product: Product): ProductDetailResponse {
    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      review: product.review,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      brand: product.brand,
      description: product.description,
      longDescription: product.longDescription,
      images: product.images || [],
      stock: product.stock,
      shipping: product.shipping,
      is_active: product.is_active,
      specifications: product.specifications,
      benefits: product.benefits,
      created_at: product.created_at
    };
  }
}
