import 'dotenv/config';
import { AppDataSource } from '@/app/database';
import { Brand } from '@/app/entities/Brand';
import { Category } from '@/app/entities/Categories';
import { Product } from '@/app/entities/Product';
import { getEmbeddingFromValues } from '@/app/utils/contentEmbedding';
import { ObjectId } from 'mongodb';

type SubCategoryContext = {
  subCategoryName?: string;
  categoryName?: string;
};

const getObjectIdString = (value: unknown): string | undefined => {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    if (ObjectId.isValid(normalized)) {
      return new ObjectId(normalized).toHexString();
    }

    return undefined;
  }

  return undefined;
};

const buildEmbedding = async (
  product: Product,
  subCategoryContextById: Map<string, SubCategoryContext>,
): Promise<number[]> => {
  const parts: string[] = [];

  if (product.name) {
    parts.push(`Tên: ${product.name}`);
  }

  if (product.description) {
    parts.push(`Mô tả: ${product.description}`);
  }

  if (product.longDescription) {
    parts.push(`Chi tiết: ${product.longDescription}`);
  }

  if (product.benefits && typeof product.benefits === 'object') {
    const benefits = Object.entries(product.benefits)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');

    if (benefits) {
      parts.push(`Lợi ích: ${benefits}`);
    }
  }

  const subCategoryId = getObjectIdString(product.subcategories);
  if (subCategoryId) {
    const subCategoryContext = subCategoryContextById.get(subCategoryId);
    if (subCategoryContext?.subCategoryName) {
      parts.push(`Danh mục con: ${subCategoryContext.subCategoryName}`);
    }
    if (subCategoryContext?.categoryName) {
      parts.push(`Nhóm danh mục: ${subCategoryContext.categoryName}`);
    }
  }

  const finalText = parts.join('\n');

  return getEmbeddingFromValues([finalText]);
};

const backfillEmbeddings = async (): Promise<void> => {
  await AppDataSource.initialize();
  const repo = AppDataSource.getMongoRepository(Product);
  const brandRepo = AppDataSource.getMongoRepository(Brand);
  const categoryRepo = AppDataSource.getMongoRepository(Category);

  const [brands, categories] = await Promise.all([brandRepo.find({ where: {} }), categoryRepo.find({ where: {} })]);

  const brandNameById = new Map<string, string>();
  for (const brand of brands) {
    const name = brand.name?.trim();
    if (name) {
      brandNameById.set(brand._id.toHexString(), name);
    }
  }

  const subCategoryContextById = new Map<string, SubCategoryContext>();
  for (const category of categories) {
    const categoryName = category.name?.trim();

    for (const subCategory of category.subcategories ?? []) {
      const subCategoryName = subCategory.name?.trim();
      if (!subCategoryName) {
        continue;
      }

      subCategoryContextById.set(subCategory._id.toHexString(), {
        subCategoryName,
        categoryName: categoryName || undefined,
      });
    }
  }

  const batchSize = 100;

  const totalProducts = await repo.count();
  console.log(`Total products in collection: ${totalProducts}`);
  console.log(`MONGODB_URI ${process.env.MONGODB_URI ? 'is set' : 'is NOT set'}`);
  let skip = 0;
  let updated = 0;
  let scanned = 0;

  while (true) {
    const products = await repo.find({ where: {}, skip, take: batchSize });
    if (products.length === 0) {
      break;
    }

    scanned += products.length;

    for (const product of products) {
      if (Array.isArray(product.embedding) && product.embedding.length > 0) {
        continue;
      }

      const embedding = await buildEmbedding(product, subCategoryContextById);
      if (!embedding.length) {
        continue;
      }

      product.embedding = embedding;
      await repo.save(product);
      updated += 1;
      if (updated % 25 === 0) {
        console.log(`Updated ${updated} products...`);
      }
    }

    skip += batchSize;
  }

  console.log(`Backfill complete. Scanned ${scanned} products, updated ${updated} products.`);
  await AppDataSource.destroy();
};

backfillEmbeddings().catch(async (error) => {
  console.error('Backfill failed:', error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
