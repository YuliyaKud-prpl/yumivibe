'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function TimerBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const defaultDuration = (block.content.duration as number) ?? 300;
  const [duration, setDuration] = useState(defaultDuration);
  const [remaining, setRemaining] = useState(
    (block.content.remaining as number) ?? defaultDuration
  );
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState((block.content.label as string) ?? 'Deep Work');
  const [editingLabel, setEditingLabel] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const start = useCallback(() => {
    if (remaining <= 0) return;
    setRunning(true);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [remaining, clearTimer]);

  const pause = useCallback(() => {
    setRunning(false);
    clearTimer();
    onUpdate({ ...block.content, duration, remaining });
  }, [block.content, duration, remaining, onUpdate, clearTimer]);

  const reset = useCallback(() => {
    setRunning(false);
    clearTimer();
    setRemaining(duration);
    onUpdate({ ...block.content, duration, remaining: duration });
  }, [block.content, duration, onUpdate, clearTimer]);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mins = Math.max(1, Math.min(999, Number(e.target.value) || 1));
    const secs = mins * 60;
    setDuration(secs);
    setRemaining(secs);
    onUpdate({ ...block.content, duration: secs, remaining: secs });
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center rounded-2xl border" style={{ borderColor: accent + '15' }}>
      {editingLabel ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => { setEditingLabel(false); onUpdate({ ...block.content, label }); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setEditingLabel(false); onUpdate({ ...block.content, label }); } }}
          autoFocus
          className="text-sm font-bold uppercase tracking-widest mb-2 bg-transparent border-b outline-none text-center w-32"
          style={{ color: accent + 'BB', borderColor: accent + '4D' }}
        />
      ) : (
        <button
          onClick={() => setEditingLabel(true)}
          className="text-sm font-bold uppercase tracking-widest mb-2 hover:opacity-70 cursor-pointer transition-opacity"
          style={{ color: accent + 'BB' }}
        >
          {label}
        </button>
      )}
      <span className="text-6xl font-black tracking-tighter text-on-surface mb-8">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <div className="flex gap-6">
        <button
          onClick={reset}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-90"
          title="Reset"
        >
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
        {!running ? (
          <button
            onClick={start}
            className="w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
            style={{ backgroundColor: accent }}
            title="Play"
          >
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </button>
        ) : (
          <button
            onClick={pause}
            className="w-16 h-16 flex items-center justify-center rounded-full text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
            style={{ backgroundColor: accent }}
            title="Pause"
          >
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
          </button>
        )}
        <button
          onClick={pause}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-90"
          title="Pause"
        >
          <span className="material-symbols-outlined">pause</span>
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-6">
        <label className="font-medium">Minutes:</label>
        <input
          type="number"
          min={1}
          max={999}
          disabled={running}
          defaultValue={Math.round(duration / 60)}
          onBlur={handleDurationChange}
          className="w-16 border border-outline-variant rounded-lg px-2 py-1 text-center text-on-surface bg-surface-container-lowest disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-outline-variant"
        />
      </div>
    </div>
  );
}
