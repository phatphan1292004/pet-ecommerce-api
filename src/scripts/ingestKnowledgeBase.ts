import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { AppDataSource } from '@/app/database';
import { KnowledgeBase } from '@/app/entities/KnowledgeBase';
import { getEmbeddingFromValues } from '@/app/utils/contentEmbedding';

type KnowledgeBaseInput = {
  title: string;
  content: string;
  tags?: string[];
  source?: string;
};

const normalizeInput = (value: KnowledgeBaseInput, index: number): KnowledgeBaseInput => {
  const title = value.title?.trim();
  const content = value.content?.trim();

  if (!title || !content) {
    throw new Error(`Invalid knowledge base item at index ${index}`);
  }

  return {
    title,
    content,
    tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    source: value.source?.trim() || undefined,
  };
};

const loadKnowledgeBaseItems = async (): Promise<KnowledgeBaseInput[]> => {
  const filePath = process.env.KNOWLEDGE_BASE_FILE || 'data/knowledge_base.sample.json';
  const resolvedPath = path.resolve(process.cwd(), filePath);

  const raw = await fs.readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as KnowledgeBaseInput[] | { items: KnowledgeBaseInput[] };

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeInput);
  }

  if (parsed && Array.isArray(parsed.items)) {
    return parsed.items.map(normalizeInput);
  }

  throw new Error('Invalid knowledge base JSON format');
};

const ingestKnowledgeBase = async (): Promise<void> => {
  await AppDataSource.initialize();
  const repo = AppDataSource.getMongoRepository(KnowledgeBase);

  const items = await loadKnowledgeBaseItems();
  let inserted = 0;

  for (const [index, item] of items.entries()) {
    const embedding = await getEmbeddingFromValues([item.title, item.content, item.tags ?? []]);
    if (embedding.length === 0) {
      console.warn(`Skipping item with empty embedding: ${item.title}`);
      continue;
    }

    const doc = repo.create({
      title: item.title,
      content: item.content,
      tags: item.tags ?? [],
      source: item.source,
      embedding,
    });

    await repo.save(doc);
    inserted += 1;

    if ((index + 1) % 20 === 0) {
      console.log(`Processed ${index + 1} items...`);
    }
  }

  console.log(`Knowledge base ingest complete. Inserted ${inserted} items.`);
  await AppDataSource.destroy();
};

ingestKnowledgeBase().catch(async (error) => {
  console.error('Knowledge base ingest failed:', error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
