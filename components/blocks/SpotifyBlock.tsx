'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';
import { useSpotify } from '@/context/SpotifyContext';
import { subscribeMedia } from '@/utils/mediaEvents';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('spotify.com')) return null;
    if (parsed.pathname.startsWith('/embed/')) return url;
    const match = parsed.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  } catch {
    return null;
  }
}

function toSpotifyUri(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
    if (!match) return null;
    return `spotify:${match[1]}:${match[2]}`;
  } catch {
    return null;
  }
}

const PRESETS = [
  { name: 'Lofi Beats', url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn' },
  { name: 'Deep Focus', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Chill Vibes', url: 'https://open.spotify.com/playlist/37i9dQZF1DX2sUQwD7tbmL' },
  { name: 'Jazz Vibes', url: 'https://open.spotify.com/playlist/37i9dQZF1DX0SM0LYsmbMT' },
];

export function SpotifyBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const spotify = useSpotify();
  const accent = dashboard.accentColor ?? '#237227';
  const savedUrl = (block.content.embedUrl as string) ?? '';
  const FALLBACK_URL = 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn';
  const [urlInput, setUrlInput] = useState(savedUrl);
  const [userPickedUrl, setUserPickedUrl] = useState(!!savedUrl && savedUrl !== FALLBACK_URL);
  const [embedUrl, setEmbedUrl] = useState<string | null>(() =>
    savedUrl ? toEmbedUrl(savedUrl) ?? savedUrl : null
  );
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeMedia('spotify', (command) => {
      if (spotify.isConnected && spotify.isReady) {
        if (command === 'play') {
          // Only play a specific URI if user explicitly picked one
          // Otherwise resume their last context (liked songs, etc.)
          const uri = userPickedUrl && urlInput ? toSpotifyUri(urlInput) : undefined;
          spotify.play(uri ?? undefined);
        }
        else if (command === 'pause') spotify.pause();
        else if (command === 'next') spotify.next();
        else if (command === 'previous') spotify.previous();
      } else {
        if (command !== 'play' && command !== 'pause') return;
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage({ command }, 'https://open.spotify.com');
        setTimeout(() => {
          iframe.contentWindow?.postMessage({ command }, 'https://open.spotify.com');
        }, 300);
      }
    });
    return unsubscribe;
  }, [spotify, urlInput]);

  const loadEmbed = useCallback((url?: string) => {
    const trimmed = (url ?? urlInput).trim();
    const isFallback = !trimmed;
    const target = trimmed || (spotify.isConnected ? '' : FALLBACK_URL);
    if (!target) return; // Connected with no URL — just resume
    const embed = toEmbedUrl(target);
    if (!embed) { setError('Invalid Spotify URL'); setEmbedUrl(null); return; }
    setError(null);
    setEmbedUrl(embed);
    setUrlInput(target);
    if (!isFallback) {
      setUserPickedUrl(true);
      onUpdate({ ...block.content, embedUrl: target });
    }

    if (spotify.isConnected && spotify.isReady) {
      const uri = toSpotifyUri(target);
      if (uri) spotify.play(uri);
    }
  }, [urlInput, block.content, onUpdate, spotify]);

  // Connected mode — show real player
  if (spotify.isConnected && spotify.isReady) {
    const track = spotify.currentTrack;
    return (
      <div className="p-4 h-full flex flex-col rounded-2xl bg-surface-container-lowest border" style={{ borderColor: accent + '15' }}>
        {/* Now playing */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          {track ? (
            <>
              {track.albumArt && (
                <img
                  src={track.albumArt}
                  alt={track.album}
                  className="w-32 h-32 rounded-xl shadow-lg mb-4 object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <p className="text-sm font-bold text-on-surface text-center truncate w-full px-2">
                {track.name}
              </p>
              <p className="text-xs text-on-surface-variant text-center truncate w-full px-2">
                {track.artist}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-5 mt-4">
                <button onClick={spotify.previous} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-xl cursor-pointer transition-colors">
                  skip_previous
                </button>
                <button
                  onClick={spotify.togglePlay}
                  className="w-12 h-12 flex items-center justify-center rounded-full text-white cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: accent }}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {track.isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button onClick={spotify.next} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-xl cursor-pointer transition-colors">
                  skip_next
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-on-surface-variant/50">
              <span className="material-symbols-outlined text-4xl mb-2 block">headphones</span>
              <p className="text-sm">Pick a playlist to start</p>
            </div>
          )}
        </div>

        {/* Status + URL input */}
        <div className="shrink-0 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 text-xs text-[#1DB954]">
              <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
              Connected
            </span>
            <button
              onClick={spotify.disconnect}
              className="text-xs text-on-surface-variant/40 hover:text-error cursor-pointer"
            >
              Disconnect
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmbed()}
              placeholder="Paste Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-outline-variant placeholder:text-on-surface-variant/40 outline-none"
            />
            <button
              onClick={() => loadEmbed()}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accent }}
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Embed mode — not connected
  return (
    <div className="p-4 h-full flex flex-col rounded-2xl bg-surface-container-lowest border" style={{ borderColor: accent + '15' }}>
      {error && <p className="text-error text-xs mb-2">{error}</p>}

      {embedUrl ? (
        <>
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden mb-3" style={{ minHeight: '280px' }}>
            <iframe
              ref={iframeRef}
              src={embedUrl + '?utm_source=generator&theme=0'}
              title="Spotify embed"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full h-full"
              style={{ minHeight: '280px' }}
            />
          </div>

          <button
            onClick={spotify.connect}
            className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-xs font-medium transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Connect for voice control & skip
          </button>

          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmbed()}
              placeholder="Change Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-outline-variant placeholder:text-on-surface-variant/40 outline-none"
            />
            <button
              onClick={() => loadEmbed()}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accent }}
            >
              <span className="material-symbols-outlined text-lg">sync</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2">
              Quick picks
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => loadEmbed(p.url)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-sm text-on-surface-variant transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base" style={{ color: accent }}>play_circle</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={spotify.connect}
            className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-xs font-medium transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Connect Spotify for full control
          </button>

          <p className="text-xs text-on-surface-variant/50 text-center mb-2">or paste a Spotify link</p>
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmbed()}
              placeholder="Paste Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-outline-variant placeholder:text-on-surface-variant/40 outline-none"
            />
            <button
              onClick={() => loadEmbed()}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accent }}
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
