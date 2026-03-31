'use client';

import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from 'react';
import { type Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

interface GreetingTheme {
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  subtitleOpacity: string;
}

const THEME_MAP: Record<string, GreetingTheme> = {
  '#8C5A3C': {
    gradientFrom: '#F3E4C9',
    gradientTo: '#BFA28C',
    textColor: '#4B2E2B',
    subtitleOpacity: '70',
  },
  '#355872': {
    gradientFrom: '#dbeafe',
    gradientTo: '#93c5fd',
    textColor: '#1e3a5f',
    subtitleOpacity: '70',
  },
  '#176B87': {
    gradientFrom: '#dbeafe',
    gradientTo: '#7dd3fc',
    textColor: '#0c3547',
    subtitleOpacity: '70',
  },
  '#237227': {
    gradientFrom: '#519A66',
    gradientTo: '#FFAA00',
    textColor: '#1a4a1d',
    subtitleOpacity: '70',
  },
};

const DEFAULT_THEME: GreetingTheme = THEME_MAP['#237227'];

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning, sunshine! \u2600\uFE0F';
  if (hour >= 12 && hour < 17) return 'Good afternoon! \u2728';
  if (hour >= 17 && hour < 22) return 'Good evening, relax time! \u2728';
  return 'Good night! \uD83C\uDF19';
}

function getSubtitle(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Your intentional space for focus and clarity. Today is a fresh page.';
  if (hour >= 12 && hour < 17) return 'Keep the momentum going. You are doing great.';
  if (hour >= 17 && hour < 22) return 'Time to wind down and relax. You earned it.';
  return 'Rest well, recharge for tomorrow.';
}

interface PaletteData {
  greetingFrom: string;
  greetingTo: string;
  greetingText: string;
}

function getThemeForDashboard(
  accentColor: string | undefined,
  palette: PaletteData | undefined,
): GreetingTheme {
  if (palette) {
    return {
      gradientFrom: palette.greetingFrom,
      gradientTo: palette.greetingTo,
      textColor: palette.greetingText,
      subtitleOpacity: '70',
    };
  }
  if (accentColor && accentColor in THEME_MAP) {
    return THEME_MAP[accentColor];
  }
  return DEFAULT_THEME;
}

export function GreetingBlock({ block, onUpdate }: BlockProps) {
  const [hour, setHour] = useState(() => new Date().getHours());
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const greetingRef = useRef<HTMLInputElement>(null);
  const subtitleRef = useRef<HTMLInputElement>(null);
  const { dashboard } = useDashboardContext();

  const theme = getThemeForDashboard(dashboard.accentColor, dashboard.palette);

  const greetingText = typeof block.content.greeting === 'string'
    ? block.content.greeting
    : getGreeting(hour);
  const subtitleText = typeof block.content.subtitle === 'string'
    ? block.content.subtitle
    : getSubtitle(hour);

  const [greetingValue, setGreetingValue] = useState(greetingText);
  const [subtitleValue, setSubtitleValue] = useState(subtitleText);

  useEffect(() => {
    if (!editingGreeting && typeof block.content.greeting !== 'string') {
      setGreetingValue(getGreeting(hour));
    }
  }, [hour, editingGreeting, block.content.greeting]);

  useEffect(() => {
    if (!editingSubtitle && typeof block.content.subtitle !== 'string') {
      setSubtitleValue(getSubtitle(hour));
    }
  }, [hour, editingSubtitle, block.content.subtitle]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHour(new Date().getHours());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const commitGreeting = useCallback(() => {
    const trimmed = greetingValue.trim();
    if (trimmed && trimmed !== getGreeting(hour)) {
      onUpdate({ ...block.content, greeting: trimmed });
    } else if (!trimmed) {
      setGreetingValue(getGreeting(hour));
      const { greeting: _g, ...rest } = block.content;
      onUpdate(rest);
    }
    setEditingGreeting(false);
  }, [greetingValue, hour, onUpdate, block.content]);

  const commitSubtitle = useCallback(() => {
    const trimmed = subtitleValue.trim();
    if (trimmed && trimmed !== getSubtitle(hour)) {
      onUpdate({ ...block.content, subtitle: trimmed });
    } else if (!trimmed) {
      setSubtitleValue(getSubtitle(hour));
      const { subtitle: _s, ...rest } = block.content;
      onUpdate(rest);
    }
    setEditingSubtitle(false);
  }, [subtitleValue, hour, onUpdate, block.content]);

  const handleGreetingKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitGreeting();
    if (e.key === 'Escape') {
      setGreetingValue(greetingText);
      setEditingGreeting(false);
    }
  }, [commitGreeting, greetingText]);

  const handleSubtitleKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitSubtitle();
    if (e.key === 'Escape') {
      setSubtitleValue(subtitleText);
      setEditingSubtitle(false);
    }
  }, [commitSubtitle, subtitleText]);

  const startEditingGreeting = useCallback(() => {
    setEditingGreeting(true);
    setTimeout(() => greetingRef.current?.select(), 0);
  }, []);

  const startEditingSubtitle = useCallback(() => {
    setEditingSubtitle(true);
    setTimeout(() => subtitleRef.current?.select(), 0);
  }, []);

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${theme.gradientFrom}, ${theme.gradientTo})`,
  };

  const subtitleColor = theme.textColor === '#ffffff'
    ? `rgba(255, 255, 255, 0.${theme.subtitleOpacity})`
    : `${theme.textColor}b3`;

  return (
    <div
      className="relative rounded-2xl p-8 min-h-[280px] h-full flex flex-col justify-end overflow-hidden shadow-[0_20px_40px_rgba(112,67,39,0.06)]"
      style={gradientStyle}
    >
      <div className="flex items-center gap-4">
        {editingGreeting ? (
          <input
            ref={greetingRef}
            value={greetingValue}
            onChange={(e) => setGreetingValue(e.target.value)}
            onBlur={commitGreeting}
            onKeyDown={handleGreetingKey}
            className="text-4xl md:text-5xl font-extrabold leading-tight bg-transparent border-none outline-none focus:ring-0 w-full"
            style={{ color: theme.textColor }}
            autoFocus
          />
        ) : (
          <button
            onClick={startEditingGreeting}
            className="text-4xl md:text-5xl font-extrabold leading-tight cursor-text text-left"
            style={{ color: theme.textColor }}
          >
            {greetingValue}
          </button>
        )}
      </div>
      <div className="mt-4">
        {editingSubtitle ? (
          <input
            ref={subtitleRef}
            value={subtitleValue}
            onChange={(e) => setSubtitleValue(e.target.value)}
            onBlur={commitSubtitle}
            onKeyDown={handleSubtitleKey}
            className="font-medium max-w-md w-full bg-transparent border-none outline-none focus:ring-0"
            style={{ color: subtitleColor }}
            autoFocus
          />
        ) : (
          <button
            onClick={startEditingSubtitle}
            className="font-medium max-w-md cursor-text text-left"
            style={{ color: subtitleColor }}
          >
            {subtitleValue}
          </button>
        )}
      </div>
      {/* Decorative blur circle */}
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
