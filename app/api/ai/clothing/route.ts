import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { clothingSuggestionSchema } from '@/lib/validators/aiSchemas';
import { getClothingSuggestion } from '@/lib/services/aiService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = clothingSuggestionSchema.safeParse({
      city: searchParams.get('city'),
      temp: searchParams.get('temp'),
      condition: searchParams.get('condition'),
    });

    if (!parsed.success) {
      throw AppError.validation('Invalid clothing suggestion parameters', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { city, temp, condition } = parsed.data;
    const suggestion = await getClothingSuggestion(city, temp, condition);

    return success({ suggestion });
  } catch (err) {
    return fromCatch(err);
  }
}
