import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { authenticateRequest } from '@/lib/middleware/auth';
import { updateUserSchema } from '@/lib/validators/authSchemas';
import { getUserById, updateUser } from '@/lib/services/authService';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const user = await getUserById(auth.userId);

    return success({ user });
  } catch (err) {
    return fromCatch(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const body: unknown = await request.json();

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Invalid profile update data', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const user = await updateUser(auth.userId, parsed.data);

    return success({ user });
  } catch (err) {
    return fromCatch(err);
  }
}
