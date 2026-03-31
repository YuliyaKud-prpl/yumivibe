'use client';

import { useState, useCallback, useRef } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function TitleBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const [text, setText] = useState((block.content.text as string) ?? '');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = useCallback(() => {
    setEditing(false);
    onUpdate({ ...block.content, text });
  }, [block.content, text, onUpdate]);

  const startEdit = useCallback(() => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  return (
    <div className="p-8 h-full flex flex-col justify-center rounded-2xl border border-surface-variant/20 shadow-[0_12px_40px_rgba(26,28,24,0.04)]">
      <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 block">
        Current Focus
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="text-4xl font-extrabold tracking-tight bg-transparent border-b-2 outline-none w-full"
          style={{ color: accent, borderColor: accent + '4D' }}
          placeholder="Type your focus..."
        />
      ) : (
        <button
          onClick={startEdit}
          className="text-left w-full cursor-pointer group"
        >
          <h2 className="text-4xl font-extrabold tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: accent }}>
            {text || <span className="text-on-surface-variant/40">Click to edit title</span>}
          </h2>
        </button>
      )}
    </div>
  );
}
