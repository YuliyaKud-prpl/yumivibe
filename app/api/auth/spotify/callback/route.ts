import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/spotify/callback`;

  if (error || !code) {
    return Response.redirect(`${origin}?spotify_error=${error ?? 'no_code'}`);
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
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${origin}?spotify_error=token_failed`);
  }

  const tokens = await tokenRes.json();

  // Redirect back to app with tokens as hash params (not visible to server)
  const params = new URLSearchParams({
    spotify_access_token: tokens.access_token,
    spotify_refresh_token: tokens.refresh_token,
    spotify_expires_in: String(tokens.expires_in),
  });

  return Response.redirect(`${origin}?${params.toString()}`);
}
