import { AppDataSource } from '@/app/database';
import { Review } from '@/app/entities/Review';
import { Product } from '@/app/entities/Product';
import { Customer } from '@/app/entities/Customer';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/app/exceptions/AppError';
import { ObjectId } from 'mongodb';

export interface CreateReviewPayload {
  productId: string;
  customerId: string;
  rating: number;
  comment: string;
  images?: string[];
}

export interface CreateReplyPayload {
  customerId: string;
  comment: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  customerId?: string;
  rating?: number;
  comment?: string;
  images?: string[];
}

export interface ReviewListParams {
  productId?: string;
  customerId?: string;
  parentId?: string;
  page?: number;
  limit?: number;
}

export interface ReviewResponse {
  _id: ObjectId;
  productId: ObjectId;
  customerId: string;
  rating: number;
  level: number;
  parentId?: ObjectId;
  customer: ReviewCustomerSummary | null;
  comment: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewCustomerSummary {
  firebaseUid: string;
  displayName: string;
  photoURL?: string | null;
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
  private customerRepo = AppDataSource.getMongoRepository(Customer);

  async getReviewById(reviewId: string): Promise<ReviewResponse> {
    const reviewObjectId = this.toObjectId(reviewId, 'reviewId');
    const review = await this.repo.findOne({ where: { _id: reviewObjectId } });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    const customer = await this.customerRepo.findOne({ where: { firebaseUid: review.customerId } });
    return this.toReviewResponse(review, customer ?? undefined);
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

    if (params.parentId) {
      where.parentId = this.toObjectId(params.parentId, 'parentId');
      where.level = 1;
    } else {
      where.level = 0;
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

    const customerMap = await this.getCustomerMap(items);

    return {
      items: items.map((item) => this.toReviewResponse(item, customerMap.get(item.customerId))),
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
      level: 0,
      parentId: undefined,
      comment: payload.comment.trim(),
      images: this.normalizeImages(payload.images),
    });

    const saved = await this.repo.save(review);
    await this.updateProductReview(productObjectId);

    const customer = await this.customerRepo.findOne({ where: { firebaseUid: saved.customerId } });
    return this.toReviewResponse(saved, customer ?? undefined);
  }

  async updateReview(reviewId: string, payload: UpdateReviewPayload): Promise<ReviewResponse> {
    const requesterId = this.normalizeCustomerId(payload.customerId, 'customerId');
    const reviewObjectId = this.toObjectId(reviewId, 'reviewId');
    const review = await this.repo.findOne({ where: { _id: reviewObjectId } });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    this.assertOwnership(review, requesterId);

    if (payload.rating !== undefined) {
      this.validateRating(payload.rating);
      review.rating = Number(payload.rating);
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

    const customer = await this.customerRepo.findOne({ where: { firebaseUid: saved.customerId } });
    return this.toReviewResponse(saved, customer ?? undefined);
  }

  async deleteReview(reviewId: string, customerId: string | undefined): Promise<void> {
    const requesterId = this.normalizeCustomerId(customerId, 'customerId');
    const reviewObjectId = this.toObjectId(reviewId, 'reviewId');
    const review = await this.repo.findOne({ where: { _id: reviewObjectId } });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    this.assertOwnership(review, requesterId);

    await this.repo.remove(review);
    await this.updateProductReview(review.productId);
  }

  async createReply(reviewId: string, payload: CreateReplyPayload): Promise<ReviewResponse> {
    if (!payload.customerId || payload.customerId.trim().length === 0) {
      throw new BadRequestError('customerId is required');
    }

    if (!payload.comment || payload.comment.trim().length === 0) {
      throw new BadRequestError('comment is required');
    }

    const parentObjectId = this.toObjectId(reviewId, 'reviewId');
    const parent = await this.repo.findOne({ where: { _id: parentObjectId } });

    if (!parent) {
      throw new NotFoundError('Review not found');
    }

    if (parent.level !== 0) {
      throw new BadRequestError('Replies can only be created for level 0 reviews');
    }

    const reply = this.repo.create({
      productId: parent.productId,
      customerId: payload.customerId.trim(),
      rating: 0,
      level: 1,
      parentId: parent._id,
      comment: payload.comment.trim(),
      images: this.normalizeImages(payload.images),
    });

    const saved = await this.repo.save(reply);
    const customer = await this.customerRepo.findOne({ where: { firebaseUid: saved.customerId } });
    return this.toReviewResponse(saved, customer ?? undefined);
  }

  async getReplies(reviewId: string, page?: number, limit?: number): Promise<ReviewListResult> {
    const parentObjectId = this.toObjectId(reviewId, 'reviewId');
    const parent = await this.repo.findOne({ where: { _id: parentObjectId } });

    if (!parent) {
      throw new NotFoundError('Review not found');
    }

    if (parent.level !== 0) {
      throw new BadRequestError('Replies can only be fetched for level 0 reviews');
    }

    return this.getReviews({ parentId: reviewId, page, limit });
  }

  private validateCreatePayload(payload: CreateReviewPayload): void {
    if (!payload.productId || payload.productId.trim().length === 0) {
      throw new BadRequestError('productId is required');
    }

    this.normalizeCustomerId(payload.customerId, 'customerId');

    if (payload.comment === undefined || payload.comment.trim().length === 0) {
      throw new BadRequestError('comment is required');
    }

    this.validateRating(payload.rating);
  }

  private normalizeCustomerId(value: string | undefined, fieldName: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    return trimmed;
  }

  private assertOwnership(review: Review, requesterId: string): void {
    if (review.customerId !== requesterId) {
      throw new ForbiddenError('Only the review owner can perform this action');
    }
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

  private toReviewResponse(review: Review, customer?: Customer): ReviewResponse {
    return {
      _id: review._id,
      productId: review.productId,
      customerId: review.customerId,
      rating: review.rating,
      level: review.level,
      parentId: review.parentId,
      customer: this.toCustomerSummary(customer),
      comment: review.comment,
      images: review.images || [],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private toCustomerSummary(customer?: Customer): ReviewCustomerSummary | null {
    if (!customer) {
      return null;
    }

    return {
      firebaseUid: customer.firebaseUid,
      displayName: customer.displayName,
      photoURL: customer.photoURL ?? null,
    };
  }

  private async getCustomerMap(reviews: Review[]): Promise<Map<string, Customer | undefined>> {
    const customerIds = Array.from(new Set(reviews.map((review) => review.customerId).filter(Boolean)));

    if (customerIds.length === 0) {
      return new Map();
    }

    const customers = await this.customerRepo.find({
      where: {
        firebaseUid: { $in: customerIds },
      },
    });

    return new Map(customers.map((customer) => [customer.firebaseUid, customer]));
  }

  private async updateProductReview(productId: ObjectId): Promise<void> {
    const result = await this.repo
      .aggregate([
        { $match: { productId, level: 0 } },
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
