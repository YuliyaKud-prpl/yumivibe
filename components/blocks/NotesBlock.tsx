'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function NotesBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const [text, setText] = useState((block.content.text as string) ?? '');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (value: string) => {
      onUpdate({ ...block.content, text: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [block.content, onUpdate]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(value), 500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden border-l-8 border-y border-r border-surface-variant/10" style={{ borderLeftColor: accent + '40' }}>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: accent }}>
            {block.title || 'Notes'}
          </h3>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: accent }}>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Saved
              </span>
            )}
            <span className="material-symbols-outlined text-outline">edit_note</span>
          </div>
        </div>
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Click to continue typing..."
          className="flex-1 w-full border-none p-0 text-on-surface-variant leading-relaxed bg-transparent resize-none focus:outline-none focus:ring-0 placeholder:italic placeholder:text-sm placeholder:text-outline"
        />
      </div>
    </div>
  );
}
