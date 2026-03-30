import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { loginSchema } from '@/lib/validators/authSchemas';
import { login } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Invalid login data', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { email, password } = parsed.data;
    const result = await login(email, password);

    return success(result);
  } catch (err) {
    return fromCatch(err);
  }
}
