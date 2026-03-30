import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) {
      throw AppError.validation('Missing refresh token');
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

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
