import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AppError } from '@/lib/utils/AppError';
import { checkGeminiLimit } from '@/lib/utils/rateLimiter';
import * as cache from '@/lib/utils/cache';

const AI_CACHE_TTL_MS = 15 * 60 * 1000;
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';

function getBedrockClient(): BedrockRuntimeClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  if (!accessKeyId || !secretAccessKey) return null;

  return new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

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

  const client = getBedrockClient();
  if (!client) {
    return getFallbackSuggestion(temp, condition);
  }

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: buildPrompt(city, temp, condition),
          },
        ],
      }),
    });

    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const text = body.content?.[0]?.text ?? '';

    if (!text) {
      return getFallbackSuggestion(temp, condition);
    }

    cache.set(cacheKey, text, AI_CACHE_TTL_MS);
    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    return getFallbackSuggestion(temp, condition);
  }
};
