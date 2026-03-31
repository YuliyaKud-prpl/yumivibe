import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { authenticateRequest } from '@/lib/middleware/auth';

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Missing refresh token'),
});

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);

    const body = await request.json();
    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Invalid request body', {
        issues: parsed.error.issues,
      });
    }

    const { refreshToken } = parsed.data;

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw AppError.internal('Spotify credentials not configured');
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      throw AppError.externalApiError('Spotify', 'Token refresh failed');
    }

    const tokens = await tokenRes.json();

    return success({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
  } catch (err) {
    return fromCatch(err);
  }
}
