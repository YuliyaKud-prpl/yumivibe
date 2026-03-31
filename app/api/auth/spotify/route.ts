import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

function generateState(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/spotify/callback`;

    const state = generateState();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      show_dialog: 'true',
      state,
    });

    const redirectUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('spotify_oauth_state', state, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to start Spotify auth' }, { status: 500 });
  }
}
