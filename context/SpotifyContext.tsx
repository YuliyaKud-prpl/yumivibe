'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/utils/storage';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

// TODO [C2/C3 – Production Hardening]: Spotify tokens are stored in localStorage,
// which is vulnerable to XSS. Migrate to httpOnly cookies set by the server.
// This requires refactoring the OAuth callback to set cookies server-side and
// updating apiClient to stop manually attaching Authorization headers.
const SPOTIFY_TOKEN_KEY = 'yumivibe-spotify-token';
const SPOTIFY_REFRESH_KEY = 'yumivibe-spotify-refresh';
const SPOTIFY_EXPIRY_KEY = 'yumivibe-spotify-expiry';

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
}

interface SpotifyContextValue {
  isConnected: boolean;
  isReady: boolean;
  deviceId: string | null;
  accessToken: string | null;
  currentTrack: SpotifyTrack | null;
  connect: () => void;
  disconnect: () => void;
  play: (uri?: string) => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  togglePlay: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

async function spotifyApi(
  endpoint: string,
  token: string,
  method = 'PUT',
  body?: Record<string, unknown>,
) {
  await fetch(`https://api.spotify.com/v1/me/player${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

interface SpotifyProviderProps {
  children: ReactNode;
}

export function SpotifyProvider({ children }: SpotifyProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { player, deviceId, isReady, currentTrack } = useSpotifyPlayer(accessToken);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const token = loadFromStorage<string>(SPOTIFY_TOKEN_KEY);
    const refresh = loadFromStorage<string>(SPOTIFY_REFRESH_KEY);
    const expiry = loadFromStorage<number>(SPOTIFY_EXPIRY_KEY);

    if (token && refresh && expiry && expiry > Date.now()) {
      setAccessToken(token);
      setRefreshToken(refresh);
      scheduleRefresh(expiry - Date.now() - 60_000, refresh);
    } else if (refresh) {
      doRefresh(refresh);
    }
  }, []);

  // C1: Read tokens from hash fragments (not query params) after OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const token = params.get('spotify_access_token');
    const refresh = params.get('spotify_refresh_token');
    const expiresIn = params.get('spotify_expires_in');

    if (token && refresh && expiresIn) {
      const expiry = Date.now() + parseInt(expiresIn, 10) * 1000;
      setAccessToken(token);
      setRefreshToken(refresh);
      saveToStorage(SPOTIFY_TOKEN_KEY, token);
      saveToStorage(SPOTIFY_REFRESH_KEY, refresh);
      saveToStorage(SPOTIFY_EXPIRY_KEY, expiry);
      scheduleRefresh(parseInt(expiresIn, 10) * 1000 - 60_000, refresh);

      // Redirect back to the dashboard where user clicked Connect
      const returnPath = loadFromStorage<string>('yumivibe-spotify-return');
      removeFromStorage('yumivibe-spotify-return');
      if (returnPath && returnPath !== '/') {
        window.location.href = returnPath;
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const doRefresh = useCallback(async (refresh: string) => {
    try {
      const res = await fetch('/api/auth/spotify/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const { accessToken: newToken, expiresIn } = json.data;
        const expiry = Date.now() + expiresIn * 1000;
        setAccessToken(newToken);
        saveToStorage(SPOTIFY_TOKEN_KEY, newToken);
        saveToStorage(SPOTIFY_EXPIRY_KEY, expiry);
        scheduleRefresh(expiresIn * 1000 - 60_000, refresh);
      }
    } catch {
      // Refresh failed
    }
  }, []);

  const scheduleRefresh = (ms: number, refresh: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (ms > 0) {
      refreshTimerRef.current = setTimeout(() => doRefresh(refresh), ms);
    }
  };

  const connect = useCallback(() => {
    // Save current page so we can redirect back after OAuth
    saveToStorage('yumivibe-spotify-return', window.location.pathname);
    window.location.href = '/api/auth/spotify';
  }, []);

  const disconnect = useCallback(() => {
    if (player) {
      player.disconnect();
    }
    setAccessToken(null);
    setRefreshToken(null);
    removeFromStorage(SPOTIFY_TOKEN_KEY);
    removeFromStorage(SPOTIFY_REFRESH_KEY);
    removeFromStorage(SPOTIFY_EXPIRY_KEY);
  }, [player]);

  const play = useCallback(async (uri?: string) => {
    if (!accessToken) return;

    if (uri) {
      // Play specific track/playlist — transfer to SDK device if available
      if (deviceId) {
        await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_ids: [deviceId], play: false }),
        });
        await new Promise((r) => setTimeout(r, 300));
        const isTrack = uri.startsWith('spotify:track:');
        const body = isTrack ? { uris: [uri], device_id: deviceId } : { context_uri: uri, device_id: deviceId };
        await spotifyApi('/play', accessToken, 'PUT', body);
      } else {
        const isTrack = uri.startsWith('spotify:track:');
        const body = isTrack ? { uris: [uri] } : { context_uri: uri };
        await spotifyApi('/play', accessToken, 'PUT', body);
      }
    } else {
      // No URI — resume last context on ANY device (don't transfer to SDK)
      // This plays whatever the user was last listening to
      await spotifyApi('/play', accessToken, 'PUT');
    }
  }, [accessToken, deviceId]);

  const pause = useCallback(async () => {
    if (!accessToken) return;
    await spotifyApi('/pause', accessToken, 'PUT');
  }, [accessToken]);

  const next = useCallback(async () => {
    if (!accessToken) return;
    await spotifyApi('/next', accessToken, 'POST');
  }, [accessToken]);

  const previous = useCallback(async () => {
    if (!accessToken) return;
    await spotifyApi('/previous', accessToken, 'POST');
  }, [accessToken]);

  const togglePlay = useCallback(async () => {
    if (currentTrack?.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [currentTrack, pause, play]);

  return (
    <SpotifyContext.Provider
      value={{
        isConnected: !!accessToken,
        isReady,
        deviceId,
        accessToken,
        currentTrack,
        connect,
        disconnect,
        play,
        pause,
        next,
        previous,
        togglePlay,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify(): SpotifyContextValue {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
}
