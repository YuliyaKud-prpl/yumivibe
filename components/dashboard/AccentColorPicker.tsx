'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardContext } from '@/context/DashboardContext';

interface AccentPalette {
  name: string;
  color: string;
}

const ACCENT_PALETTES: readonly AccentPalette[] = [
  { name: 'Sage', color: '#237227' },
  { name: 'Rose', color: '#8B4557' },
  { name: 'Ocean', color: '#3B6B8B' },
  { name: 'Amber', color: '#8B6914' },
  { name: 'Lavender', color: '#6B5B8B' },
  { name: 'Coral', color: '#B85C4B' },
  { name: 'Teal', color: '#3B7B7B' },
  { name: 'Slate', color: '#5B6B7B' },
] as const;

export function AccentColorPicker() {
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

  const handleSelect = (color: string) => {
    updateDashboard({ accentColor: color });
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Accent color picker"
        title="Accent color"
      >
        <span
          className="w-5 h-5 rounded-full border-2 transition-transform"
          style={{
            backgroundColor: currentAccent,
            borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl p-3 border border-outline-variant/30"
          style={{
            backgroundColor: isDark ? '#262921' : '#ffffff',
            boxShadow: isDark
              ? '0 20px 40px rgba(0,0,0,0.3)'
              : '0 20px 40px rgba(82,99,79,0.12)',
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
            Accent Color
          </h3>
          <div className="flex flex-col gap-0.5">
            {ACCENT_PALETTES.map((palette) => {
              const isActive = currentAccent === palette.color;
              return (
                <button
                  key={palette.color}
                  onClick={() => handleSelect(palette.color)}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isActive
                      ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(82,99,79,0.08)')
                      : 'transparent',
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
                  aria-label={`Select ${palette.name} accent color`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border-2 transition-transform"
                    style={{
                      backgroundColor: palette.color,
                      borderColor: isActive
                        ? (isDark ? '#ffffff' : '#237227')
                        : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                      transform: isActive ? 'scale(1.15)' : undefined,
                    }}
                  />
                  <span
                    className="text-sm"
                    style={{
                      color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {palette.name}
                  </span>
                  {isActive && (
                    <span
                      className="material-symbols-outlined text-[16px] ml-auto"
                      style={{ color: palette.color }}
                    >
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
