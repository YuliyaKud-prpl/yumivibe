'use client';

import { useState, useEffect, useCallback } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function ClockBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const [now, setNow] = useState(() => new Date());
  const [is24h, setIs24h] = useState(() => (block.content.is24h as boolean) ?? false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggle = useCallback(() => {
    setIs24h((prev) => {
      const next = !prev;
      onUpdate({ ...block.content, is24h: next });
      return next;
    });
  }, [block.content, onUpdate]);

  const timeStr = is24h
    ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center text-center rounded-2xl border" style={{ borderColor: accent + '15' }}>
      <button
        onClick={toggle}
        className="text-6xl font-black tracking-tighter hover:opacity-80 transition-opacity cursor-pointer"
        style={{ color: accent }}
        title={`Switch to ${is24h ? '12h' : '24h'}`}
      >
        {timeStr}
      </button>
      <p className="text-on-surface-variant font-bold mt-2 uppercase tracking-widest text-sm">
        {dateStr}
      </p>
    </div>
  );
}
