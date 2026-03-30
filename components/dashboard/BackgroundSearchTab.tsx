'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface BackgroundSearchTabProps {
  onBackgroundChange: (background: string, backgroundType: 'unsplash') => void;
  currentBackground?: string;
  onClose: () => void;
}

const CURATED_IMAGES = [
  {
    label: 'Mountains',
    gradient: 'linear-gradient(180deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  },
  {
    label: 'Ocean',
    gradient: 'linear-gradient(180deg, #89CFF0 0%, #2563eb 50%, #1e3a5f 100%)',
  },
  {
    label: 'Forest',
    gradient: 'linear-gradient(180deg, #a8e063 0%, #2d6a4f 60%, #1b4332 100%)',
  },
  {
    label: 'Sunset',
    gradient: 'linear-gradient(180deg, #fad0c4 0%, #ff9a9e 40%, #a855f7 100%)',
  },
  {
    label: 'Desert',
    gradient: 'linear-gradient(180deg, #fef3c7 0%, #d97706 50%, #92400e 100%)',
  },
  {
    label: 'Aurora',
    gradient: 'linear-gradient(180deg, #0f172a 0%, #065f46 50%, #6ee7b7 100%)',
  },
  {
    label: 'Twilight',
    gradient: 'linear-gradient(180deg, #1e1b4b 0%, #4338ca 50%, #f97316 100%)',
  },
  {
    label: 'Snowfall',
    gradient: 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 50%, #475569 100%)',
  },
] as const;

export function BackgroundSearchTab({
  onBackgroundChange,
  currentBackground,
  onClose,
}: BackgroundSearchTabProps) {
  const [query, setQuery] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const filteredImages = query.trim()
    ? CURATED_IMAGES.filter((img) =>
        img.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : CURATED_IMAGES;

  const handleSelect = (gradient: string) => {
    onBackgroundChange(gradient, 'unsplash');
    onClose();
  };

  return (
    <div className="space-y-3">
      <div
        className={`
          flex items-center gap-2 rounded-lg border px-3 py-2
          ${isDark
            ? 'border-white/15 bg-white/5'
            : 'border-outline-variant bg-surface-container-low'
          }
        `}
      >
        <span className="material-symbols-outlined text-base text-on-surface-variant">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search backgrounds..."
          className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filteredImages.map((img) => (
          <button
            key={img.label}
            onClick={() => handleSelect(img.gradient)}
            className={`
              group relative h-20 overflow-hidden rounded-xl border-2 cursor-pointer
              transition-transform hover:scale-[1.03]
            `}
            style={{
              background: img.gradient,
              borderColor: currentBackground === img.gradient
                ? (isDark ? '#ffffff' : '#237227')
                : 'transparent',
            }}
            aria-label={`Select ${img.label} background`}
            title={img.label}
          >
            <span
              className={`
                absolute inset-x-0 bottom-0 px-2 py-1 text-xs font-medium text-white
                bg-gradient-to-t from-black/50 to-transparent
                opacity-0 group-hover:opacity-100 transition-opacity
              `}
            >
              {img.label}
            </span>
          </button>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <p className="py-4 text-center text-xs text-on-surface-variant/60">
          No results for &quot;{query}&quot;
        </p>
      )}

      <p className="text-center text-[10px] text-on-surface-variant/40">
        Powered by Unsplash
      </p>
    </div>
  );
}
