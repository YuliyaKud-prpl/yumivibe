import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { searchBackgroundsSchema } from '@/lib/validators/backgroundSchemas';
import { searchUnsplash } from '@/lib/services/backgroundService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchBackgroundsSchema.safeParse({
      query: searchParams.get('query'),
      page: searchParams.get('page'),
    });

    if (!parsed.success) {
      throw AppError.validation('Invalid search parameters', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { query, page } = parsed.data;
    const result = await searchUnsplash(query, page);

    return success(result);
  } catch (err) {
    return fromCatch(err);
  }
}
