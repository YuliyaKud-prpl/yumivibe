import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';

const callbackQuerySchema = z.object({
  code: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    // H1: Validate CSRF state parameter
    const state = request.nextUrl.searchParams.get('state');
    const storedState = request.cookies.get('spotify_oauth_state')?.value;
    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(`${origin}?spotify_error=state_mismatch`);
    }

    const error = request.nextUrl.searchParams.get('error');
    if (error) {
      return NextResponse.redirect(`${origin}?spotify_error=${error}`);
    }

    const rawCode = request.nextUrl.searchParams.get('code');
    const parsed = callbackQuerySchema.safeParse({ code: rawCode });
    if (!parsed.success) {
      return NextResponse.redirect(`${origin}?spotify_error=no_code`);
    }

    const { code } = parsed.data;
    const redirectUri = `${origin}/api/auth/spotify/callback`;

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
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw AppError.externalApiError('Spotify', 'Token exchange failed');
    }

    const tokens = await tokenRes.json();

    // C1: Use hash fragments so tokens never appear in server logs or Referer headers
    const params = new URLSearchParams({
      spotify_access_token: tokens.access_token,
      spotify_refresh_token: tokens.refresh_token,
      spotify_expires_in: String(tokens.expires_in),
    });

    // Clear the state cookie and redirect with hash fragment
    const response = NextResponse.redirect(`${origin}/#${params.toString()}`);
    response.cookies.set('spotify_oauth_state', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 0,
    });
    return response;
  } catch (err) {
    if (err instanceof AppError && err.status >= 500) {
      return fromCatch(err);
    }
    return NextResponse.redirect(`${origin}?spotify_error=token_failed`);
  }
}
