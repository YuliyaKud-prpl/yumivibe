import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { registerSchema } from '@/lib/validators/authSchemas';
import { register } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Invalid registration data', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { email, password, displayName } = parsed.data;
    const result = await register(email, password, displayName);

    return success(result, 201);
  } catch (err) {
    return fromCatch(err);
  }
}
