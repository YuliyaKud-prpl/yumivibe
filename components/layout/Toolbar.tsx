'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { type BlockType } from '@/types/dashboard';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardContext } from '@/context/DashboardContext';
import { useSpotify } from '@/context/SpotifyContext';
import { AddBlockMenu } from '@/components/dashboard/AddBlockMenu';
import { PalettePicker } from '@/components/dashboard/PalettePicker';
import { VoiceControl } from '@/components/dashboard/VoiceControl';

interface ToolbarProps {
  dashboardName: string;
  onNameChange: (name: string) => void;
  onAddBlock: (type: BlockType) => void;
}

export function Toolbar({ dashboardName, onNameChange, onAddBlock }: ToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(dashboardName);
  const [backHovered, setBackHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { dashboard, blocks, updateDashboard } = useDashboardContext();
  const { isConnected: spotifyConnected } = useSpotify();
  const accentColor = dashboard.accentColor ?? '#237227';
  const hasYoutube = blocks.some((b) => b.type === 'youtube');
  const hasSpotify = blocks.some((b) => b.type === 'spotify');

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== dashboardName) {
      onNameChange(trimmed);
    } else {
      setNameValue(dashboardName);
    }
    setEditing(false);
  }, [nameValue, dashboardName, onNameChange]);

  const startEditing = useCallback(() => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  return (
    <header
      className="backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-wrap justify-between items-center w-full"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(26,29,17,0.85)' : 'rgba(255,255,255,0.85)',
        boxShadow: `0 4px 24px ${accentColor}14`,
        borderBottom: `1px solid ${accentColor}10`,
      }}
    >
      {/* Left side: back + editable name */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="transition-colors p-2 rounded-full"
          aria-label="Back to home"
          style={{ color: backHovered ? accentColor : undefined }}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>

        {/* Editable dashboard name */}
        <div className="group relative min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setNameValue(dashboardName);
                  setEditing(false);
                }
              }}
              className="text-xl font-bold tracking-tight bg-transparent border-none outline-none focus:ring-0 text-on-surface dark:text-surface-container-lowest"
              autoFocus
            />
          ) : (
            <button
              onClick={startEditing}
              className="text-xl font-bold tracking-tight cursor-text"
              style={{ color: accentColor }}
            >
              {dashboardName}
            </button>
          )}
        </div>
      </div>

      {/* Right side: icon group + add block */}
      <div className="flex items-center gap-3">
        {/* Grouped icon buttons */}
        <div className="flex items-center gap-2">
          <PalettePicker />

          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 text-on-surface-variant transition-colors"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {(hasYoutube || hasSpotify) && (
            <VoiceControl
              hasYoutube={hasYoutube}
              hasSpotify={hasSpotify}
              spotifyConnected={spotifyConnected}
            />
          )}
        </div>

        {/* Add Block button */}
        <AddBlockMenu onAddBlock={onAddBlock} accentColor={accentColor} />
      </div>
    </header>
  );
}
