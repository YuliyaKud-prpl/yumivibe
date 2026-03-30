'use client';

import { useEffect, useRef, useState } from 'react';
import { BLOCK_TYPES, type BlockType } from '@/types/dashboard';
import { useTheme } from '@/context/ThemeContext';

interface AddBlockMenuProps {
  onAddBlock: (type: BlockType) => void;
  accentColor?: string;
}

const blockMeta: Record<BlockType, { label: string; icon: string }> = {
  greeting: { label: 'Greeting', icon: 'waving_hand' },
  clock:    { label: 'Clock',    icon: 'schedule' },
  timer:    { label: 'Timer',    icon: 'timer' },
  pomodoro: { label: 'Pomodoro', icon: 'target' },
  weather:  { label: 'Weather',  icon: 'cloud' },
  quotes:   { label: 'Quotes',   icon: 'format_quote' },
  notes:    { label: 'Notes',    icon: 'edit_note' },
  todos:    { label: 'To-Dos',   icon: 'checklist' },
  youtube:  { label: 'YouTube',  icon: 'play_circle' },
  spotify:  { label: 'Spotify',  icon: 'music_note' },
  title:    { label: 'Title',    icon: 'title' },
};

export function AddBlockMenu({ onAddBlock, accentColor }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  return (
    <div ref={menuRef} className="relative ml-2">
      {/* Primary Add Block trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 hover:opacity-90"
        style={{ backgroundColor: accentColor ?? '#237227' }}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Block
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl p-3 border border-outline-variant/30"
          style={{
            backgroundColor: isDark ? '#262921' : '#ffffff',
            boxShadow: isDark
              ? '0 20px 40px rgba(0,0,0,0.3)'
              : '0 20px 40px rgba(82,99,79,0.12)',
          }}
        >
          <div className="grid grid-cols-3 gap-1">
            {BLOCK_TYPES.map((type) => {
              const meta = blockMeta[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    onAddBlock(type);
                    setOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors text-on-surface"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#30332B' : '#F3F5E2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span className="material-symbols-outlined text-[22px] text-primary">
                    {meta.icon}
                  </span>
                  <span className="text-xs font-semibold">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
