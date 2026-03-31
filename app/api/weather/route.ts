import { NextRequest } from 'next/server';
import { weatherQuerySchema } from '@/lib/validators/weatherSchemas';
import { getWeatherForCity, getWeatherByCoords } from '@/lib/services/weatherService';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const params: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }

    const parsed = weatherQuerySchema.safeParse(params);
    if (!parsed.success) {
      throw AppError.validation('Invalid query parameters', {
        issues: parsed.error.issues,
      });
    }

    const query = parsed.data;
    const result = 'city' in query
      ? await getWeatherForCity(query.city)
      : await getWeatherByCoords(query.latitude, query.longitude);

    return success(result);
  } catch (err) {
    return fromCatch(err);
  }
}
