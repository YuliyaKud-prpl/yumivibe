import { AppError } from '@/lib/utils/AppError';
import { checkGeminiLimit } from '@/lib/utils/rateLimiter';
import * as cache from '@/lib/utils/cache';

const GEMINI_CACHE_TTL_MS = 15 * 60 * 1000;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const buildPrompt = (
  city: string,
  temp: number,
  condition: string
): string =>
  `You are a friendly fashion advisor. Based on the current weather in ${city} ` +
  `(${temp} degrees, ${condition}), suggest what to wear today. ` +
  `Keep it concise (2-3 sentences), practical, and cheerful. ` +
  `Include specific clothing items.`;

const buildCacheKey = (
  city: string,
  temp: number,
  condition: string
): string =>
  `ai:clothing:${city.toLowerCase()}:${Math.round(temp)}:${condition.toLowerCase()}`;

const getFallbackSuggestion = (
  temp: number,
  condition: string
): string => {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return `Bring a waterproof jacket and an umbrella! With ${temp} degrees and rain, layering is key. Waterproof shoes are a must.`;
  }

  if (lowerCondition.includes('snow') || lowerCondition.includes('blizzard')) {
    return `Bundle up warmly! At ${temp} degrees with snow, wear a heavy coat, scarf, gloves, and insulated boots.`;
  }

  if (temp <= 0) {
    return `It's freezing at ${temp} degrees! Wear a heavy winter coat, thermal layers, warm gloves, a scarf, and insulated boots.`;
  }

  if (temp <= 10) {
    return `It's chilly at ${temp} degrees. A warm jacket, layered sweater, and closed-toe shoes will keep you comfortable.`;
  }

  if (temp <= 20) {
    return `At ${temp} degrees, a light jacket or cardigan over a long-sleeve shirt is perfect. Jeans and sneakers work great.`;
  }

  if (temp <= 30) {
    return `It's warm at ${temp} degrees! Opt for a light t-shirt, shorts or a sundress, and comfortable sandals. Don't forget sunscreen!`;
  }

  return `It's hot at ${temp} degrees! Wear breathable fabrics like cotton or linen, light colors, a hat, and stay hydrated.`;
};

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export const getClothingSuggestion = async (
  city: string,
  temp: number,
  condition: string
): Promise<string> => {
  const cacheKey = buildCacheKey(city, temp, condition);
  const cached = cache.get<string>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const rateCheck = checkGeminiLimit();
  if (!rateCheck.allowed) {
    throw AppError.rateLimitGemini();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getFallbackSuggestion(temp, condition);
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(city, temp, condition) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw AppError.rateLimitGemini();
      }
      throw AppError.externalApiError(
        'Gemini',
        `HTTP ${response.status}`
      );
    }

    const data = (await response.json()) as GeminiResponse;
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      return getFallbackSuggestion(temp, condition);
    }

    cache.set(cacheKey, text, GEMINI_CACHE_TTL_MS);
    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    return getFallbackSuggestion(temp, condition);
  }
};
