import { NextRequest } from 'next/server';
import { googleAuthSchema } from '@/lib/validators/googleAuthSchema';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: string;
  name: string;
  picture: string;
  aud: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = googleAuthSchema.safeParse(body);

    if (!parsed.success) {
      throw AppError.validation('Invalid request body', {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { credential } = parsed.data;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
    );

    if (!tokenRes.ok) {
      throw AppError.unauthorized('Invalid Google credential');
    }

    const tokenInfo: GoogleTokenInfo = await tokenRes.json();

    if (clientId && tokenInfo.aud !== clientId) {
      throw AppError.unauthorized('Token audience mismatch');
    }

    if (tokenInfo.email_verified !== 'true') {
      throw AppError.unauthorized('Email not verified');
    }

    const user = {
      id: `google-${tokenInfo.sub}`,
      email: tokenInfo.email,
      displayName: tokenInfo.name,
      avatarUrl: tokenInfo.picture ?? null,
      provider: 'google' as const,
    };

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };

    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify(tokenPayload));
    const token = `${header}.${payload}.`;

    return success({ user, token }, 200);
  } catch (err) {
    return fromCatch(err);
  }
}
