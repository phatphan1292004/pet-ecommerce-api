const DEFAULT_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
const GOOGLE_AI_STUDIO_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;

type GeminiEmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
};

const getGoogleAiStudioApiKey = (): string => {
  if (!GOOGLE_AI_STUDIO_API_KEY) {
    throw new Error('GEMINI_API_KEY or GOOGLE_AI_STUDIO_API_KEY is not set');
  }

  return GOOGLE_AI_STUDIO_API_KEY;
};

export const buildEmbeddingText = (values: Array<unknown>): string => {
  const chunks: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        chunks.push(trimmed);
      }
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      chunks.push(String(value));
      continue;
    }

    if (Array.isArray(value)) {
      const nested = buildEmbeddingText(value);
      if (nested) {
        chunks.push(nested);
      }
      continue;
    }

    if (typeof value === 'object') {
      const nested = buildEmbeddingText(Object.values(value));
      if (nested) {
        chunks.push(nested);
      }
    }
  }

  return chunks.join(' ');
};

export const getGoogleAiStudioEmbedding = async (text: string, model = DEFAULT_MODEL): Promise<number[]> => {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const apiKey = getGoogleAiStudioApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: normalized }],
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI Studio embedding request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiEmbeddingResponse;

  return data.embedding?.values ?? [];
};

export const getEmbeddingFromValues = async (
  values: Array<unknown>,
  model = DEFAULT_MODEL,
): Promise<number[]> => {
  const text = buildEmbeddingText(values);
  return getGoogleAiStudioEmbedding(text, model);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const length = Math.min(a.length, b.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const valueA = a[i] ?? 0;
    const valueB = b[i] ?? 0;
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
