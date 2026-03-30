'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';
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

export function SpotifyBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const savedUrl = (block.content.embedUrl as string) ?? '';
  const [urlInput, setUrlInput] = useState(savedUrl);
  const [embedUrl, setEmbedUrl] = useState<string | null>(() =>
    savedUrl ? toEmbedUrl(savedUrl) ?? savedUrl : null
  );
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeMedia('spotify', (command) => {
      if (command !== 'play' && command !== 'pause') return;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      // Send twice with delay — Spotify embed sometimes misses the first message
      iframe.contentWindow.postMessage({ command }, 'https://open.spotify.com');
      setTimeout(() => {
        iframe.contentWindow?.postMessage({ command }, 'https://open.spotify.com');
      }, 300);
    });
    return unsubscribe;
  }, []);

  const loadEmbed = useCallback((url?: string) => {
    const trimmed = (url ?? urlInput).trim();
    if (!trimmed) { setError('Please enter a Spotify URL'); return; }
    const embed = toEmbedUrl(trimmed);
    if (!embed) { setError('Invalid Spotify URL'); setEmbedUrl(null); return; }
    setError(null);
    setEmbedUrl(embed);
    setUrlInput(trimmed);
    onUpdate({ ...block.content, embedUrl: trimmed });
  }, [urlInput, block.content, onUpdate]);

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
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmbed()}
              placeholder="Change Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-primary placeholder:text-on-surface-variant/40 outline-none"
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

          {/* Or paste URL */}
          <p className="text-xs text-on-surface-variant/50 text-center mb-2">or paste a Spotify link</p>
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmbed()}
              placeholder="Paste Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-primary placeholder:text-on-surface-variant/40 outline-none"
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
