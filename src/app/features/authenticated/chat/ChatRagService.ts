import { ObjectId } from 'mongodb';
import { AppDataSource } from '../../../database';
import { KnowledgeBase } from '../../../entities/KnowledgeBase';
import { BadRequestError } from '../../../exceptions/AppError';
import { getGoogleAiStudioEmbedding, cosineSimilarity } from '../../../utils/contentEmbedding';
import { generateGeminiResponse } from '../../../utils/geminiChat';
import { ProductService } from '../../guest/product/ProductService';
import { buildChatRagPrompt } from './ChatPrompt';

const DEFAULT_KB_LIMIT = 6;
const DEFAULT_PRODUCT_LIMIT = 6;
const DEFAULT_VECTOR_CANDIDATES = 80;
const KB_VECTOR_INDEX = process.env.KB_VECTOR_INDEX || '';

export interface RagQuestionPayload {
  question: string;
  limit?: number;
  productLimit?: number;
  includeProducts?: boolean;
}

export interface RagSourceItem {
  id: string;
  title: string;
  source: string | null;
  score: number;
}

export interface RagProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  discount: number;
  review: number;
  image: string;
}

export interface RagAnswerResponse {
  answer: string;
  sources: RagSourceItem[];
  products: RagProductItem[];
}

type KnowledgeBaseResult = KnowledgeBase & { score?: number };

export class ChatRagService {
  private knowledgeRepo = AppDataSource.getMongoRepository(KnowledgeBase);
  private productService = new ProductService();

  async askQuestion(payload: RagQuestionPayload): Promise<RagAnswerResponse> {
    const question = payload.question?.trim();
    if (!question) {
      throw new BadRequestError('question is required');
    }

    const kbLimit = this.normalizeLimit(payload.limit, DEFAULT_KB_LIMIT, 20);
    const productLimit = this.normalizeLimit(payload.productLimit, DEFAULT_PRODUCT_LIMIT, 12);
    const includeProducts = payload.includeProducts !== false;

    const queryEmbedding = await getGoogleAiStudioEmbedding(question);
    if (queryEmbedding.length === 0) {
      throw new BadRequestError('Unable to create embedding for question');
    }

    const [kbResults, productResults] = await Promise.all([
      this.searchKnowledgeBase(queryEmbedding, kbLimit),
      includeProducts ? this.getProductSuggestions(question, queryEmbedding, productLimit) : Promise.resolve([]),
    ]);

    const prompt = this.buildPrompt(question, kbResults, productResults);
    const answer = await generateGeminiResponse(prompt);

    return {
      answer,
      sources: kbResults.map((item) => ({
        id: item._id instanceof ObjectId ? item._id.toHexString() : String(item._id),
        title: item.title,
        source: item.source ?? null,
        score: item.score ?? 0,
      })),
      products: productResults,
    };
  }

  private normalizeLimit(value: number | undefined, fallback: number, maxValue: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(Math.max(Math.floor(value), 1), maxValue);
  }

  private async searchKnowledgeBase(queryEmbedding: number[], limit: number): Promise<KnowledgeBaseResult[]> {
    if (KB_VECTOR_INDEX) {
      return this.searchKnowledgeBaseVector(queryEmbedding, limit);
    }

    return this.searchKnowledgeBaseCosine(queryEmbedding, limit);
  }

  private async searchKnowledgeBaseVector(queryEmbedding: number[], limit: number): Promise<KnowledgeBaseResult[]> {
    try {
      const cursor = this.knowledgeRepo.aggregate([
        {
          $vectorSearch: {
            index: KB_VECTOR_INDEX,
            queryVector: queryEmbedding,
            path: 'embedding',
            numCandidates: DEFAULT_VECTOR_CANDIDATES,
            limit,
          },
        },
        {
          $project: {
            title: 1,
            content: 1,
            tags: 1,
            source: 1,
            embedding: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ]);

      const results = (await cursor.toArray()) as KnowledgeBaseResult[];
      return results;
    } catch (error) {
      return this.searchKnowledgeBaseCosine(queryEmbedding, limit);
    }
  }

  private async searchKnowledgeBaseCosine(queryEmbedding: number[], limit: number): Promise<KnowledgeBaseResult[]> {
    const docs = await this.knowledgeRepo.find({ where: {} });

    const scored = docs
      .map((doc) => ({
        ...doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding ?? []),
      }))
      .filter((doc) => (doc.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return scored.slice(0, limit);
  }

  private async getProductSuggestions(
    question: string,
    queryEmbedding: number[],
    limit: number,
  ): Promise<RagProductItem[]> {
    const result = await this.productService.searchProductsForChatbot(question, 1, limit, 'latest');
    let items = result.items;

    // Fallback to semantic search if keyword token-based search returns no results
    if (items.length === 0 && queryEmbedding && queryEmbedding.length > 0) {
      const vectorProducts = await this.productService.searchProductsByEmbedding(queryEmbedding, limit);
      items = vectorProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        originalPrice: p.originalPrice,
        discount: p.discount,
        review: p.review,
        image: p.image,
      }));
    }

    return items.map((product) => ({
      id: product._id instanceof ObjectId ? product._id.toHexString() : String(product._id),
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      review: product.review,
      image: product.image,
    }));
  }

  private buildPrompt(
    question: string,
    kbResults: KnowledgeBaseResult[],
    productResults: RagProductItem[],
  ): string {
    const contextText = kbResults
      .map((item, index) => {
        const tags = (item.tags ?? []).join(', ');
        const source = item.source ? `Source: ${item.source}` : 'Source: (none)';
        return `Context ${index + 1}\nTitle: ${item.title}\n${source}\nTags: ${tags || '(none)'}\nContent: ${item.content}`;
      })
      .join('\n\n');

    const productText = productResults
      .map((product, index) =>
        `Product ${index + 1}\nName: ${product.name}\nSlug: ${product.slug}\nPrice: ${product.price}\nOriginalPrice: ${product.originalPrice}\nDiscount: ${product.discount}\nReview: ${product.review}`,
      )
      .join('\n\n');

    return buildChatRagPrompt(question, contextText, productText);
  }
}
