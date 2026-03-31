import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { loginSchema } from '@/lib/validators/authSchemas';
import { login } from '@/lib/services/authService';
import { checkRateLimit } from '@/lib/utils/rateLimiter';

const LOGIN_RATE_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

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

    // Rate limit per email (prevents brute force on specific account)
    const emailKey = `login:${email.toLowerCase()}`;
    const emailLimit = checkRateLimit(emailKey, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS);

    // Rate limit per IP (prevents distributed attacks)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ipKey = `login-ip:${ip}`;
    const ipLimit = checkRateLimit(ipKey, 20, LOGIN_WINDOW_MS);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const resetAt = Math.max(emailLimit.resetAt, ipLimit.resetAt);
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
      throw new AppError(
        'RATE_LIMIT_LOGIN',
        'Too many login attempts. Please try again later.',
        429,
        { retryAfterSeconds: retryAfterSec },
      );
    }

    const result = await login(email, password);

    return success(result);
  } catch (err) {
    return fromCatch(err);
  }
}
