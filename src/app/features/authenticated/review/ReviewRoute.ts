import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateReplyPayload,
  CreateReviewPayload,
  ReviewListParams,
  ReviewService,
  UpdateReviewPayload,
} from './ReviewService';

const router = Router();
const reviewService = new ReviewService();

router.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: ReviewListParams = {
      productId: req.query.productId as string | undefined,
      customerId: req.query.customerId as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const reviews = await reviewService.getReviews(params);
    res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reviews/:reviewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string;
    const review = await reviewService.getReviewById(reviewId);
    res.status(200).json({
      success: true,
      message: 'Review fetched successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reviews/:reviewId/replies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const replies = await reviewService.getReplies(reviewId, page, limit);
    res.status(200).json({
      success: true,
      message: 'Replies fetched successfully',
      data: replies,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as CreateReviewPayload;
    const review = await reviewService.createReview(payload);
    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reviews/:reviewId/replies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string;
    const payload = req.body as CreateReplyPayload;
    const reply = await reviewService.createReply(reviewId, payload);
    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      data: reply,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/reviews/:reviewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string;
    const payload = req.body as UpdateReviewPayload;
    const review = await reviewService.updateReview(reviewId, payload);
    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/reviews/:reviewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string;
    const customerId = req.body?.customerId as string | undefined;
    await reviewService.deleteReview(reviewId, customerId);
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
