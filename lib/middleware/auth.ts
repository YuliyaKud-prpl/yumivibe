import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/services/authService';
import { AppError } from '@/lib/utils/AppError';
import { AuthPayload } from '@/types/user';

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthPayload> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    throw AppError.unauthorized('Missing Authorization header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw AppError.unauthorized('Invalid Authorization header format. Expected: Bearer <token>');
  }

  const token = parts[1];
  if (!token) {
    throw AppError.unauthorized('Missing token');
  }

  try {
    const payload = await verifyToken(token);
    return { userId: payload.userId, role: payload.role };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw AppError.unauthorized('Invalid or expired token');
  }
}

export function requireAdmin(auth: AuthPayload): void {
  if (auth.role !== 'admin') {
    throw AppError.forbidden('Admin access required');
  }
}
