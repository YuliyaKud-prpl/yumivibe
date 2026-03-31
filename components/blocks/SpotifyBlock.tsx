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

const PRESETS = [
  { name: 'Lofi Beats', url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn' },
  { name: 'Deep Focus', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Chill Vibes', url: 'https://open.spotify.com/playlist/37i9dQZF1DX2sUQwD7tbmL' },
  { name: 'Jazz Vibes', url: 'https://open.spotify.com/playlist/37i9dQZF1DX0SM0LYsmbMT' },
];

const FALLBACK_URL = 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn';

export function SpotifyBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const spotify = useSpotify();
  const accent = dashboard.accentColor ?? '#237227';
  const rawSavedUrl = (block.content.embedUrl as string) ?? '';
  const savedUrl = rawSavedUrl === FALLBACK_URL ? '' : rawSavedUrl;
  const [urlInput, setUrlInput] = useState(savedUrl);
  const [embedUrl, setEmbedUrl] = useState<string | null>(() =>
    savedUrl ? toEmbedUrl(savedUrl) ?? savedUrl : null
  );
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Voice control — SDK for skip/next, postMessage for play/pause
  useEffect(() => {
    const unsubscribe = subscribeMedia('spotify', (command) => {
      if (spotify.isConnected && (command === 'next' || command === 'previous')) {
        if (command === 'next') spotify.next();
        else spotify.previous();
        return;
      }
      // Play/pause via embed postMessage (works reliably)
      if (command !== 'play' && command !== 'pause') return;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage({ command }, 'https://open.spotify.com');
      setTimeout(() => {
        iframe.contentWindow?.postMessage({ command }, 'https://open.spotify.com');
      }, 300);
    });
    return unsubscribe;
  }, [spotify]);

  const loadEmbed = useCallback((url?: string) => {
    const trimmed = (url ?? urlInput).trim();
    const target = trimmed || (spotify.isConnected ? '' : FALLBACK_URL);
    if (!target) return;
    const embed = toEmbedUrl(target);
    if (!embed) { setError('Invalid Spotify URL'); setEmbedUrl(null); return; }
    setError(null);
    setEmbedUrl(embed);
    setUrlInput(target);
    if (trimmed) {
      onUpdate({ ...block.content, embedUrl: target });
    }
  }, [urlInput, block.content, onUpdate, spotify]);

  return (
    <div className="p-4 h-full flex flex-col rounded-2xl bg-surface-container-lowest border" style={{ borderColor: accent + '15' }}>
      {error && <p className="text-error text-xs mb-2">{error}</p>}

      {embedUrl ? (
        <>
          {/* Embed player — always handles playback */}
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden mb-2">
            <iframe
              ref={iframeRef}
              src={embedUrl + '?utm_source=generator&theme=0'}
              title="Spotify embed"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full h-full"
              style={{ minHeight: '152px' }}
            />
          </div>

          {/* Connection status */}
          {spotify.isConnected ? (
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1 text-xs text-[#1DB954]">
                <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
                Voice: skip &amp; previous enabled
              </span>
              <button onClick={spotify.disconnect} className="text-xs text-on-surface-variant/40 hover:text-error cursor-pointer">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={spotify.connect}
              className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-xs font-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              Connect for skip &amp; previous
            </button>
          )}

          {/* URL input */}
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
          {/* Quick picks */}
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

          {/* Connection status */}
          {spotify.isConnected ? (
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1 text-xs text-[#1DB954]">
                <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
                Connected — pick a playlist
              </span>
              <button onClick={spotify.disconnect} className="text-xs text-on-surface-variant/40 hover:text-error cursor-pointer">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={spotify.connect}
              className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-xs font-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              Connect for voice control
            </button>
          )}

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
