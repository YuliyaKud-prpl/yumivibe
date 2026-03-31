'use client';

import { useState, useEffect, useRef } from 'react';
import { loadFromStorage } from '@/utils/storage';
import type { SpotifyTrack } from '@/context/SpotifyContext';

const SPOTIFY_TOKEN_KEY = 'yumivibe-spotify-token';

interface UseSpotifyPlayerResult {
  player: Spotify.Player | null;
  deviceId: string | null;
  isReady: boolean;
  currentTrack: SpotifyTrack | null;
}

export function useSpotifyPlayer(
  accessToken: string | null
): UseSpotifyPlayerResult {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null);

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

      player.addListener('player_state_changed', (state) => {
        if (!state) {
          setCurrentTrack(null);
          return;
        }
        const s = state as Record<string, unknown>;
        const trackWindow = s.track_window as Record<string, unknown> | undefined;
        const current = trackWindow?.current_track as Record<string, unknown> | undefined;
        if (current) {
          const artists = current.artists as Array<{ name: string }> | undefined;
          const album = current.album as Record<string, unknown> | undefined;
          const images = album?.images as Array<{ url: string }> | undefined;
          setCurrentTrack({
            name: (current.name as string) ?? 'Unknown',
            artist: artists?.map((a) => a.name).join(', ') ?? 'Unknown',
            album: (album?.name as string) ?? '',
            albumArt: images?.[0]?.url ?? null,
            durationMs: (s.duration as number) ?? 0,
            positionMs: (s.position as number) ?? 0,
            isPlaying: !(s.paused as boolean),
          });
        }
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

  return { player: playerRef.current, deviceId, isReady, currentTrack };
}
