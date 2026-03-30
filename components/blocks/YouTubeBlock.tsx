'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';
import { subscribeMedia } from '@/utils/mediaEvents';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

interface PlaylistItem {
  id: string;
  url: string;
}

export function YouTubeBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const savedPlaylist = (block.content.playlist as PlaylistItem[] | undefined) ?? [];
  const savedIndex = (block.content.currentIndex as number | undefined) ?? 0;

  const [urlInput, setUrlInput] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(savedPlaylist);
  const [currentIndex, setCurrentIndex] = useState(savedIndex);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentVideo = playlist[currentIndex] ?? null;

  useEffect(() => {
    const unsubscribe = subscribeMedia('youtube', (command) => {
      if (command === 'next') {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % playlist.length;
          onUpdate({ ...block.content, playlist, currentIndex: next });
          return next;
        });
        return;
      }
      if (command === 'previous') {
        setCurrentIndex((prev) => {
          const next = (prev - 1 + playlist.length) % playlist.length;
          onUpdate({ ...block.content, playlist, currentIndex: next });
          return next;
        });
        return;
      }
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      const func = command === 'play' ? 'playVideo' : 'pauseVideo';
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: '' }),
        'https://www.youtube.com'
      );
    });
    return unsubscribe;
  }, [playlist, block.content, onUpdate]);

  const persist = useCallback((items: PlaylistItem[], index: number) => {
    onUpdate({ ...block.content, playlist: items, currentIndex: index });
  }, [block.content, onUpdate]);

  const addVideo = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) { setError('Please enter a YouTube URL'); return; }
    const id = extractVideoId(trimmed);
    if (!id) { setError('Invalid YouTube URL'); return; }
    if (playlist.some((item) => item.id === id)) { setError('Video already in playlist'); return; }

    setError(null);
    const updated = [...playlist, { id, url: trimmed }];
    setPlaylist(updated);
    if (playlist.length === 0) setCurrentIndex(0);
    persist(updated, playlist.length === 0 ? 0 : currentIndex);
    setUrlInput('');
  }, [urlInput, playlist, currentIndex, persist]);

  const removeVideo = useCallback((index: number) => {
    const updated = playlist.filter((_, i) => i !== index);
    let newIndex = currentIndex;
    if (index < currentIndex || (index === currentIndex && currentIndex >= updated.length)) {
      newIndex = Math.max(0, currentIndex - 1);
    }
    setPlaylist(updated);
    setCurrentIndex(newIndex);
    persist(updated, newIndex);
  }, [playlist, currentIndex, persist]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    persist(playlist, index);
  }, [playlist, persist]);

  return (
    <div className="p-4 h-full flex flex-col rounded-2xl bg-surface-container-lowest border" style={{ borderColor: accent + '15' }}>
      {/* Player */}
      {currentVideo ? (
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden mb-3">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${currentVideo.id}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/30 mb-3">
          <div className="text-center text-on-surface-variant/40">
            <span className="material-symbols-outlined text-4xl mb-1 block">playlist_play</span>
            <span className="text-sm">Add videos to your playlist</span>
          </div>
        </div>
      )}

      {/* Playlist controls */}
      {playlist.length > 1 && (
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => goTo((currentIndex - 1 + playlist.length) % playlist.length)}
            className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-xl cursor-pointer transition-colors"
          >skip_previous</button>
          <span className="text-xs text-on-surface-variant font-medium">
            {currentIndex + 1} / {playlist.length}
          </span>
          <button
            onClick={() => goTo((currentIndex + 1) % playlist.length)}
            className="material-symbols-outlined text-on-surface-variant hover:text-on-surface text-xl cursor-pointer transition-colors"
          >skip_next</button>
        </div>
      )}

      {/* Playlist items (collapsible) */}
      {playlist.length > 0 && (
        <div className="max-h-[4.5rem] overflow-y-auto mb-2 space-y-1">
          {playlist.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors"
              style={{ backgroundColor: i === currentIndex ? accent + '15' : undefined }}
              onClick={() => goTo(i)}
            >
              <span className="material-symbols-outlined text-sm" style={{ color: i === currentIndex ? accent : undefined }}>
                {i === currentIndex ? 'play_arrow' : 'drag_indicator'}
              </span>
              <span className="truncate flex-1 text-on-surface-variant">
                Video {i + 1}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeVideo(i); }}
                className="material-symbols-outlined text-sm text-on-surface-variant/40 hover:text-error cursor-pointer"
              >close</button>
            </div>
          ))}
        </div>
      )}

      {/* URL input */}
      {error && <p className="text-error text-xs mb-1">{error}</p>}
      <div className="flex gap-2 shrink-0">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addVideo()}
          placeholder="Paste YouTube URL..."
          className="flex-1 bg-surface-container-low text-on-surface text-sm rounded-lg py-2 px-3 border border-outline-variant/30 focus:border-primary placeholder:text-on-surface-variant/40 outline-none"
        />
        <button
          onClick={addVideo}
          className="px-3 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
          style={{ backgroundColor: accent }}
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
    </div>
  );
}
