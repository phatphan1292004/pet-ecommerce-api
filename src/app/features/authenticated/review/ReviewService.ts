import { AppDataSource } from '@/app/database';
import { Review } from '@/app/entities/Review';
import { Product } from '@/app/entities/Product';
import { BadRequestError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface CreateReviewPayload {
  productId: string;
  customerId: string;
  rating: number;
  level: number;
  comment: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  rating?: number;
  level?: number;
  comment?: string;
  images?: string[];
}

export interface ReviewListParams {
  productId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface ReviewResponse {
  _id: ObjectId;
  productId: ObjectId;
  customerId: string;
  rating: number;
  level: number;
  comment: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewListResult {
  items: ReviewResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ReviewService {
  private repo = AppDataSource.getMongoRepository(Review);
  private productRepo = AppDataSource.getMongoRepository(Product);

  async getReviewById(reviewId: string): Promise<ReviewResponse> {
    const reviewObjectId = this.toObjectId(reviewId, 'reviewId');
    const review = await this.repo.findOne({ where: { _id: reviewObjectId } });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    return this.toReviewResponse(review);
  }

  async getReviews(params: ReviewListParams): Promise<ReviewListResult> {
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 40) : 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.productId) {
      where.productId = this.toObjectId(params.productId, 'productId');
    }

    if (params.customerId && params.customerId.trim().length > 0) {
      where.customerId = params.customerId.trim();
    }

    const [items, total] = await Promise.all([
      this.repo.find({
        where,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      }),
      this.repo.count({ where }),
    ]);

    return {
      items: items.map(this.toReviewResponse),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  async createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
    this.validateCreatePayload(payload);

    const productObjectId = this.toObjectId(payload.productId, 'productId');
    const product = await this.productRepo.findOne({ where: { _id: productObjectId } });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const review = this.repo.create({
      productId: productObjectId,
      customerId: payload.customerId.trim(),
      rating: Number(payload.rating),
      level: this.normalizeLevel(payload.level),
      comment: payload.comment.trim(),
      images: this.normalizeImages(payload.images),
    });

    const saved = await this.repo.save(review);
    await this.updateProductReview(productObjectId);

    return this.toReviewResponse(saved);
  }

  async updateReview(reviewId: string, payload: UpdateReviewPayload): Promise<ReviewResponse> {
    const reviewObjectId = this.toObjectId(reviewId, 'reviewId');
    const review = await this.repo.findOne({ where: { _id: reviewObjectId } });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (payload.rating !== undefined) {
      this.validateRating(payload.rating);
      review.rating = Number(payload.rating);
    }

    if (payload.level !== undefined) {
      review.level = this.normalizeLevel(payload.level);
    }

    if (payload.comment !== undefined) {
      const comment = payload.comment.trim();
      if (!comment) {
        throw new BadRequestError('comment cannot be empty');
      }
      review.comment = comment;
    }

    if (payload.images !== undefined) {
      review.images = this.normalizeImages(payload.images);
    }

    const saved = await this.repo.save(review);
    await this.updateProductReview(review.productId);

    return this.toReviewResponse(saved);
  }

  async deleteReview(reviewId: string): Promise<void> {
    const reviewObjectId = this.toObjectId(reviewId, 'reviewId');
    const review = await this.repo.findOne({ where: { _id: reviewObjectId } });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    await this.repo.remove(review);
    await this.updateProductReview(review.productId);
  }

  private validateCreatePayload(payload: CreateReviewPayload): void {
    if (!payload.productId || payload.productId.trim().length === 0) {
      throw new BadRequestError('productId is required');
    }

    if (!payload.customerId || payload.customerId.trim().length === 0) {
      throw new BadRequestError('customerId is required');
    }

    if (payload.comment === undefined || payload.comment.trim().length === 0) {
      throw new BadRequestError('comment is required');
    }

    this.validateRating(payload.rating);
    this.normalizeLevel(payload.level);
  }

  private validateRating(rating: number): void {
    const value = Number(rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      throw new BadRequestError('rating must be between 1 and 5');
    }
  }

  private normalizeImages(images: string[] | undefined): string[] {
    if (!Array.isArray(images)) {
      return [];
    }

    return images
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
  }

  private toObjectId(value: string, fieldName: string): ObjectId {
    const trimmed = value?.trim();
    if (!trimmed || !ObjectId.isValid(trimmed)) {
      throw new BadRequestError(`Invalid ${fieldName} format`);
    }

    return new ObjectId(trimmed);
  }

  private toReviewResponse(review: Review): ReviewResponse {
    return {
      _id: review._id,
      productId: review.productId,
      customerId: review.customerId,
      rating: review.rating,
      level: review.level,
      comment: review.comment,
      images: review.images || [],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private normalizeLevel(level: number): number {
    const value = Number(level);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestError('level must be a non-negative number');
    }

    return Math.floor(value);
  }

  private async updateProductReview(productId: ObjectId): Promise<void> {
    const result = await this.repo
      .aggregate([
        { $match: { productId } },
        {
          $group: {
            _id: '$productId',
            avgRating: { $avg: '$rating' },
          },
        },
      ])
      .toArray();

    const avgRating = result[0]?.avgRating ?? 0;
    const normalizedRating = Math.round(avgRating * 10) / 10;

    await this.productRepo.updateMany({ _id: productId }, { $set: { review: normalizedRating } });
  }
}
