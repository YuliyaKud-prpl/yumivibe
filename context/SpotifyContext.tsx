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

const SPOTIFY_TOKEN_KEY = 'yumivibe-spotify-token';
const SPOTIFY_REFRESH_KEY = 'yumivibe-spotify-refresh';
const SPOTIFY_EXPIRY_KEY = 'yumivibe-spotify-expiry';

interface SpotifyContextValue {
  isConnected: boolean;
  isReady: boolean;
  deviceId: string | null;
  accessToken: string | null;
  connect: () => void;
  disconnect: () => void;
  play: (uri?: string) => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
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
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<Spotify.Player | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Check URL params for tokens from OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
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

      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('spotify_access_token');
      url.searchParams.delete('spotify_refresh_token');
      url.searchParams.delete('spotify_expires_in');
      window.history.replaceState({}, '', url.pathname);
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

  // Initialize Web Playback SDK
  useEffect(() => {
    if (!accessToken) return;

    const script = document.getElementById('spotify-sdk');
    if (!script) {
      const s = document.createElement('script');
      s.id = 'spotify-sdk';
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      document.body.appendChild(s);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new Spotify.Player({
        name: 'YumiVibe',
        getOAuthToken: (cb: (token: string) => void) => {
          const token = loadFromStorage<string>(SPOTIFY_TOKEN_KEY);
          if (token) cb(token);
        },
        volume: 0.5,
      });

      player.addListener('ready', (data) => {
        setDeviceId(data.device_id as string);
        setIsReady(true);
      });

      player.addListener('not_ready', () => {
        setIsReady(false);
        setDeviceId(null);
      });

      player.connect();
      playerRef.current = player;
    };

    // If SDK already loaded
    if (window.Spotify?.Player) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setIsReady(false);
        setDeviceId(null);
      }
    };
  }, [accessToken]);

  const connect = useCallback(() => {
    window.location.href = '/api/auth/spotify';
  }, []);

  const disconnect = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    setAccessToken(null);
    setRefreshToken(null);
    setDeviceId(null);
    setIsReady(false);
    removeFromStorage(SPOTIFY_TOKEN_KEY);
    removeFromStorage(SPOTIFY_REFRESH_KEY);
    removeFromStorage(SPOTIFY_EXPIRY_KEY);
  }, []);

  const play = useCallback(async (uri?: string) => {
    if (!accessToken || !deviceId) return;
    // Transfer playback to YumiVibe device first
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play: true }),
    });
    if (uri) {
      await spotifyApi('/play', accessToken, 'PUT', { context_uri: uri });
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

  return (
    <SpotifyContext.Provider
      value={{
        isConnected: !!accessToken,
        isReady,
        deviceId,
        accessToken,
        connect,
        disconnect,
        play,
        pause,
        next,
        previous,
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
