'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardContext } from '@/context/DashboardContext';
import { BackgroundUploadTab } from './BackgroundUploadTab';

interface Palette {
  name: string;
  colors: [string, string, string, string];
  background: string;
  accent: string;
  greetingFrom: string;
  greetingTo: string;
  greetingText: string;
}

const PALETTES: readonly Palette[] = [
  {
    name: 'Tropical Jungle',
    colors: ['#237227', '#519A66', '#FFAA00', '#FFD786'],
    background: 'linear-gradient(135deg, #f0f7f0, #e8f5e3)',
    accent: '#237227',
    greetingFrom: '#519A66',
    greetingTo: '#FFAA00',
    greetingText: '#1a4a1d',
  },
  {
    name: 'Warm Morning',
    colors: ['#F9F3EE', '#F3E4C9', '#BFA28C', '#8C5A3C'],
    background: 'linear-gradient(135deg, #fff8f2, #fef3c7)',
    accent: '#8C5A3C',
    greetingFrom: '#F3E4C9',
    greetingTo: '#BFA28C',
    greetingText: '#4B2E2B',
  },
  {
    name: 'Ocean Breeze',
    colors: ['#EEF5FF', '#B4D4FF', '#86B6F6', '#176B87'],
    background: 'linear-gradient(135deg, #eef5ff, #dbeafe)',
    accent: '#176B87',
    greetingFrom: '#B4D4FF',
    greetingTo: '#86B6F6',
    greetingText: '#0f3d52',
  },
  {
    name: 'Forest Calm',
    colors: ['#F1F3E0', '#D2DCB6', '#A1BC98', '#237227'],
    background: 'linear-gradient(135deg, #f1f3e0, #e8edd6)',
    accent: '#237227',
    greetingFrom: '#D2DCB6',
    greetingTo: '#A1BC98',
    greetingText: '#3D4A38',
  },
  {
    name: 'Sunset Glow',
    colors: ['#FFF6E9', '#FFD7C4', '#FF9B82', '#C2555A'],
    background: 'linear-gradient(135deg, #fff6e9, #ffe8d6)',
    accent: '#C2555A',
    greetingFrom: '#FFD7C4',
    greetingTo: '#FF9B82',
    greetingText: '#6B2530',
  },
  {
    name: 'Lavender Dream',
    colors: ['#F5F0FF', '#D5C6F0', '#A594C6', '#6B4D8A'],
    background: 'linear-gradient(135deg, #f5f0ff, #ede5ff)',
    accent: '#6B4D8A',
    greetingFrom: '#D5C6F0',
    greetingTo: '#A594C6',
    greetingText: '#3D2B54',
  },
] as const;

export function PalettePicker() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { dashboard, updateDashboard } = useDashboardContext();
  const isDark = theme === 'dark';
  const currentAccent = dashboard.accentColor ?? '#237227';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handlePaletteSelect = (palette: Palette) => {
    updateDashboard({
      background: palette.background,
      backgroundType: 'gradient',
      accentColor: palette.accent,
      palette: {
        greetingFrom: palette.greetingFrom,
        greetingTo: palette.greetingTo,
        greetingText: palette.greetingText,
      },
    });
    setOpen(false);
  };

  const handleImageUpload = (background: string, backgroundType: 'image') => {
    updateDashboard({ background, backgroundType });
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 text-on-surface-variant transition-colors cursor-pointer"
        aria-label="Theme palette picker"
        title="Theme palette"
      >
        <span className="material-symbols-outlined">palette</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-outline-variant/30"
          style={{
            backgroundColor: isDark ? '#262921' : '#ffffff',
            boxShadow: isDark
              ? '0 20px 40px rgba(0,0,0,0.3)'
              : '0 20px 40px rgba(82,99,79,0.12)',
          }}
        >
          {/* Palette list */}
          <div className="p-3 space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
              Theme Palette
            </h3>
            {PALETTES.map((palette) => {
              const isActive = currentAccent === palette.accent;
              return (
                <PaletteRow
                  key={palette.name}
                  palette={palette}
                  isActive={isActive}
                  isDark={isDark}
                  onSelect={handlePaletteSelect}
                />
              );
            })}
          </div>

          {/* Divider */}
          <div
            className="mx-3 border-t"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }}
          />

          {/* Background image upload */}
          <div className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
              Background Image
            </h3>
            <BackgroundUploadTab onBackgroundChange={handleImageUpload} />
          </div>
        </div>
      )}
    </div>
  );
}

interface PaletteRowProps {
  palette: Palette;
  isActive: boolean;
  isDark: boolean;
  onSelect: (palette: Palette) => void;
}

function PaletteRow({ palette, isActive, isDark, onSelect }: PaletteRowProps) {
  return (
    <button
      onClick={() => onSelect(palette)}
      className="flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-colors cursor-pointer"
      style={{
        backgroundColor: isActive
          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(82,99,79,0.08)')
          : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(82,99,79,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      aria-label={`Select ${palette.name} palette`}
    >
      {/* Color strip */}
      <div className="flex rounded-md overflow-hidden shrink-0">
        {palette.colors.map((color, i) => (
          <span
            key={`${palette.name}-${i}`}
            className="w-6 h-6"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Name */}
      <span
        className="text-sm truncate"
        style={{
          color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {palette.name}
      </span>

      {/* Checkmark */}
      {isActive && (
        <span
          className="material-symbols-outlined text-[16px] ml-auto shrink-0"
          style={{ color: palette.accent }}
        >
          check
        </span>
      )}
    </button>
  );
}
