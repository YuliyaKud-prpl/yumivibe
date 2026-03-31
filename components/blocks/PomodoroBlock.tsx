'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

type SessionType = 'work' | 'break';

const RING_RADIUS = 88;
const RING_STROKE = 12;
const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2;
const RING_CENTER = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function PomodoroBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const workSecs = ((block.content.workMinutes as number) ?? 25) * 60;
  const breakSecs = ((block.content.breakMinutes as number) ?? 5) * 60;

  const [session, setSession] = useState<SessionType>('work');
  const [remaining, setRemaining] = useState(workSecs);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.value = 800;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 0.65);
    } catch {
      // Audio not supported
    }
  }, []);

  const totalSecs = session === 'work' ? workSecs : breakSecs;
  const progress = totalSecs > 0 ? ((totalSecs - remaining) / totalSecs) * 100 : 0;
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        clearTimer();
        playChime();
        setSession((s) => {
          if (s === 'work') {
            setCycles((c) => c + 1);
            setRemaining(breakSecs);
            return 'break';
          }
          setRemaining(workSecs);
          return 'work';
        });
        return 0;
      }
      return prev - 1;
    });
  }, [clearTimer, playChime, workSecs, breakSecs]);

  useEffect(() => {
    if (running && remaining > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [running, remaining, session, tick]);

  const play = useCallback(() => {
    if (remaining <= 0) return;
    setRunning(true);
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [remaining, clearTimer, tick]);

  const pause = useCallback(() => {
    setRunning(false);
    clearTimer();
    onUpdate({ ...block.content, cycles });
  }, [block.content, cycles, onUpdate, clearTimer]);

  const reset = useCallback(() => {
    setRunning(false);
    clearTimer();
    setSession('work');
    setRemaining(workSecs);
    setCycles(0);
    onUpdate({ ...block.content, cycles: 0 });
  }, [block.content, workSecs, onUpdate, clearTimer]);

  const skip = useCallback(() => {
    clearTimer();
    if (session === 'work') {
      setCycles((c) => c + 1);
      setSession('break');
      setRemaining(breakSecs);
    } else {
      setSession('work');
      setRemaining(workSecs);
    }
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [session, running, workSecs, breakSecs, clearTimer, tick]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center rounded-2xl border" style={{ borderColor: accent + '15' }}>
      {/* Progress ring */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            className="text-surface-container"
          />
          <circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            fill="transparent"
            stroke={accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-on-surface">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {session === 'work' ? 'Focus Session' : 'Break Time'}
          </span>
          {cycles > 0 && (
            <span className="text-[10px] text-on-surface-variant/60 mt-0.5">
              Cycle {cycles}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={reset}
          className="text-on-surface-variant transition-colors"
          style={{ '--accent': accent } as React.CSSProperties}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = ''; }}
          title="Reset"
        >
          <span className="material-symbols-outlined text-3xl">replay</span>
        </button>
        {!running ? (
          <button
            onClick={play}
            className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            style={{ backgroundColor: accent }}
            title="Play"
          >
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </button>
        ) : (
          <button
            onClick={pause}
            className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            style={{ backgroundColor: accent }}
            title="Pause"
          >
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
          </button>
        )}
        <button
          onClick={skip}
          className="text-on-surface-variant transition-colors"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = ''; }}
          title="Skip"
        >
          <span className="material-symbols-outlined text-3xl">skip_next</span>
        </button>
      </div>
    </div>
  );
}
