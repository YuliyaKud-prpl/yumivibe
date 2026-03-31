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

const FALLBACK_URL = 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn';

export function SpotifyBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const spotify = useSpotify();
  const accent = dashboard.accentColor ?? '#237227';
  const rawSavedUrl = (block.content.embedUrl as string) ?? '';
  const savedUrl = rawSavedUrl === FALLBACK_URL ? '' : rawSavedUrl;
  const [urlInput, setUrlInput] = useState(savedUrl);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // For non-connected users: embed URL
  const [embedUrl, setEmbedUrl] = useState<string | null>(() =>
    savedUrl ? toEmbedUrl(savedUrl) ?? savedUrl : null
  );

  // Voice control — all via SDK when connected
  useEffect(() => {
    const unsubscribe = subscribeMedia('spotify', (command) => {
      if (spotify.isConnected) {
        if (command === 'play') spotify.play();
        else if (command === 'pause') spotify.pause();
        else if (command === 'next') spotify.next();
        else if (command === 'previous') spotify.previous();
      } else {
        // Fallback: embed postMessage (play/pause only)
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
  }, [spotify]);

  const loadUrl = useCallback((url?: string) => {
    const trimmed = (url ?? urlInput).trim();

    if (!trimmed) {
      // Clear — go back to context mode
      setEmbedUrl(null);
      setUrlInput('');
      setError(null);
      onUpdate({ ...block.content, embedUrl: '' });
      return;
    }

    if (!toEmbedUrl(trimmed) && !toSpotifyUri(trimmed)) {
      setError('Invalid Spotify URL');
      return;
    }

    setError(null);
    setUrlInput(trimmed);
    onUpdate({ ...block.content, embedUrl: trimmed });

    if (spotify.isConnected) {
      // Connected — play via SDK
      const uri = toSpotifyUri(trimmed);
      if (uri) spotify.play(uri);
    } else {
      // Not connected — load embed
      const embed = toEmbedUrl(trimmed);
      if (embed) setEmbedUrl(embed);
    }
  }, [urlInput, block.content, onUpdate, spotify]);


  const track = spotify.currentTrack;

  // CONNECTED MODE — SDK player for everything
  if (spotify.isConnected) {
    return (
      <div className="p-4 h-full flex flex-col rounded-2xl bg-surface-container-lowest border" style={{ borderColor: accent + '15' }}>
        {error && <p className="text-error text-xs mb-2">{error}</p>}

        {/* Now Playing */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          {track ? (
            <>
              {track.albumArt && (
                <img
                  src={track.albumArt}
                  alt={track.album}
                  className="w-28 h-28 rounded-xl shadow-lg mb-3 object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <p className="text-sm font-bold text-on-surface text-center truncate w-full px-2">
                {track.name}
              </p>
              <p className="text-xs text-on-surface-variant text-center truncate w-full px-2">
                {track.artist}
              </p>
              <div className="flex items-center gap-5 mt-3">
                <button onClick={spotify.previous} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-xl cursor-pointer">skip_previous</button>
                <button
                  onClick={spotify.togglePlay}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-white cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {track.isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button onClick={spotify.next} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-xl cursor-pointer">skip_next</button>
              </div>
            </>
          ) : (
            <div className="text-center text-on-surface-variant/50">
              <span className="material-symbols-outlined text-4xl mb-2 block">headphones</span>
              <p className="text-sm">Say &quot;play&quot; or pick a playlist</p>
            </div>
          )}
        </div>

        {/* Status + URL input */}
        <div className="shrink-0 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 text-xs text-[#1DB954]">
              <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
              {urlInput ? 'Playing playlist' : 'Playing your music'}
            </span>
            <button onClick={spotify.disconnect} className="text-xs text-on-surface-variant/40 hover:text-error cursor-pointer">
              Disconnect
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
              placeholder="Paste Spotify URL or clear for your music..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-outline-variant placeholder:text-on-surface-variant/40 outline-none"
            />
            <button
              onClick={() => loadUrl()}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accent }}
            >
              <span className="material-symbols-outlined text-lg">{urlInput ? 'play_arrow' : 'sync'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NOT CONNECTED — embed mode
  return (
    <div className="p-4 h-full flex flex-col rounded-2xl bg-surface-container-lowest border" style={{ borderColor: accent + '15' }}>
      {error && <p className="text-error text-xs mb-2">{error}</p>}

      {embedUrl ? (
        <>
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
          <button
            onClick={spotify.connect}
            className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-xs font-medium transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Connect for voice control &amp; skip
          </button>
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
              placeholder="Change Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-outline-variant placeholder:text-on-surface-variant/40 outline-none"
            />
            <button
              onClick={() => loadUrl()}
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
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2">Quick picks</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => loadUrl(p.url)}
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
            Connect for voice control
          </button>
          <p className="text-xs text-on-surface-variant/50 text-center mb-2">or paste a Spotify link</p>
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
              placeholder="Paste Spotify URL..."
              className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-outline-variant placeholder:text-on-surface-variant/40 outline-none"
            />
            <button
              onClick={() => loadUrl()}
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
