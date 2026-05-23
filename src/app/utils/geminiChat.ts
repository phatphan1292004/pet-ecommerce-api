const DEFAULT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const GOOGLE_AI_STUDIO_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;

type GeminiChatResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const getGoogleAiStudioApiKey = (): string => {
  if (!GOOGLE_AI_STUDIO_API_KEY) {
    throw new Error('GEMINI_API_KEY or GOOGLE_AI_STUDIO_API_KEY is not set');
  }

  return GOOGLE_AI_STUDIO_API_KEY;
};

export const generateGeminiResponse = async (
  prompt: string,
  model = DEFAULT_MODEL,
  temperature = 0.3,
  maxOutputTokens = 512,
): Promise<string> => {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return '';
  }

  const apiKey = getGoogleAiStudioApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: normalizedPrompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI Studio chat request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiChatResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return text.trim();
};
