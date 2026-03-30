'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { BackgroundUploadTab } from './BackgroundUploadTab';
import { BackgroundSearchTab } from './BackgroundSearchTab';

type BackgroundType = 'color' | 'gradient' | 'image' | 'unsplash';
type TabId = 'colors' | 'gradients' | 'upload' | 'search';

interface BackgroundPickerProps {
  onBackgroundChange: (background: string, backgroundType: BackgroundType) => void;
  currentBackground?: string;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'colors', label: 'Colors', icon: 'palette' },
  { id: 'gradients', label: 'Gradients', icon: 'gradient' },
  { id: 'upload', label: 'Upload', icon: 'upload_file' },
  { id: 'search', label: 'Search', icon: 'image_search' },
];

const PRESET_COLORS = [
  '#ffffff', '#F9FBE8', '#FFF8F2', '#F0F4FF',
  '#ECFDF5', '#FDF2F8', '#1A1D11', '#2D1B2E',
  '#1A2332', '#0F2318', '#2C2416', '#1E1E1E',
] as const;

const PRESET_GRADIENTS = [
  { label: 'Warm Morning', value: 'linear-gradient(135deg, #fff8f2, #fef3c7)' },
  { label: 'Cool Blue', value: 'linear-gradient(135deg, #f0f4ff, #dbeafe)' },
  { label: 'Fresh Green', value: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' },
  { label: 'Soft Pink', value: 'linear-gradient(135deg, #fdf2f8, #fce7f3)' },
  { label: 'Golden', value: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
  { label: 'Lavender', value: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' },
  { label: 'Dark Night', value: 'linear-gradient(135deg, #1a1a2e, #16213e)' },
  { label: 'Dark Ocean', value: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
] as const;

export function BackgroundPicker({ onBackgroundChange, currentBackground }: BackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('colors');
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

  const handleColorSelect = (color: string) => {
    onBackgroundChange(color, 'color');
    setOpen(false);
  };

  const handleGradientSelect = (gradient: string) => {
    onBackgroundChange(gradient, 'gradient');
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 text-on-surface-variant transition-colors cursor-pointer"
        aria-label="Background picker"
        title="Background"
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
          {/* Tab navigation */}
          <div className="flex border-b border-outline-variant/20 px-1 pt-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex flex-col items-center gap-0.5 rounded-t-lg px-1 py-2
                  text-[10px] font-medium cursor-pointer transition-colors
                  ${activeTab === tab.id
                    ? (isDark
                        ? 'text-primary bg-white/10'
                        : 'text-primary bg-primary/5')
                    : 'text-on-surface-variant hover:text-on-surface'
                  }
                `}
                aria-label={tab.label}
                title={tab.label}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'colors' && (
              <ColorsTab
                colors={PRESET_COLORS}
                currentBackground={currentBackground}
                isDark={isDark}
                onSelect={handleColorSelect}
              />
            )}
            {activeTab === 'gradients' && (
              <GradientsTab
                gradients={PRESET_GRADIENTS}
                currentBackground={currentBackground}
                isDark={isDark}
                onSelect={handleGradientSelect}
              />
            )}
            {activeTab === 'upload' && (
              <BackgroundUploadTab onBackgroundChange={onBackgroundChange} />
            )}
            {activeTab === 'search' && (
              <BackgroundSearchTab
                onBackgroundChange={onBackgroundChange}
                currentBackground={currentBackground}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ColorsTabProps {
  colors: readonly string[];
  currentBackground?: string;
  isDark: boolean;
  onSelect: (color: string) => void;
}

function ColorsTab({ colors, currentBackground, isDark, onSelect }: ColorsTabProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
          style={{
            backgroundColor: color,
            borderColor: currentBackground === color
              ? (isDark ? '#ffffff' : '#237227')
              : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
          }}
          aria-label={`Select color ${color}`}
          title={color}
        />
      ))}
      <label
        className="w-8 h-8 rounded-full border-2 overflow-hidden cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        }}
        title="Custom color"
      >
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          colorize
        </span>
        <input
          type="color"
          className="sr-only"
          onChange={(e) => onSelect(e.target.value)}
        />
      </label>
    </div>
  );
}

interface GradientsTabProps {
  gradients: readonly { label: string; value: string }[];
  currentBackground?: string;
  isDark: boolean;
  onSelect: (gradient: string) => void;
}

function GradientsTab({ gradients, currentBackground, isDark, onSelect }: GradientsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {gradients.map((gradient) => (
        <button
          key={gradient.label}
          onClick={() => onSelect(gradient.value)}
          className="w-full h-12 rounded-lg border-2 transition-transform hover:scale-[1.03] cursor-pointer"
          style={{
            background: gradient.value,
            borderColor: currentBackground === gradient.value
              ? (isDark ? '#ffffff' : '#237227')
              : 'transparent',
          }}
          aria-label={`Select gradient ${gradient.label}`}
          title={gradient.label}
        />
      ))}
    </div>
  );
}
