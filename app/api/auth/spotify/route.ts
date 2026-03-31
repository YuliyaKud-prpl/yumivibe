import { NextRequest } from 'next/server';
import crypto from 'crypto';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/spotify/callback`;

  // H1: Generate CSRF state parameter
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    show_dialog: 'true',
    state,
  });

  const response = Response.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
  response.headers.append(
    'Set-Cookie',
    `spotify_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
  );
  return response;
}
