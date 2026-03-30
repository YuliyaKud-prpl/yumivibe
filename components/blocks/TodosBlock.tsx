'use client';

import { useState, useCallback } from 'react';
import { Block, TodoItem } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function TodosBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const [items, setItems] = useState<TodoItem[]>(
    (block.content.items as TodoItem[]) ?? []
  );
  const [input, setInput] = useState('');

  const persist = useCallback(
    (next: TodoItem[]) => {
      setItems(next);
      onUpdate({ ...block.content, items: next });
    },
    [block.content, onUpdate]
  );

  const addItem = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
    };
    persist([...items, item]);
    setInput('');
  }, [input, items, persist]);

  const toggleItem = useCallback(
    (id: string) => {
      persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
    },
    [items, persist]
  );

  const deleteItem = useCallback(
    (id: string) => {
      persist(items.filter((i) => i.id !== id));
    },
    [items, persist]
  );

  return (
    <div className="p-8 h-full flex flex-col rounded-2xl border" style={{ borderColor: accent + '15' }}>
      {/* Header */}
      <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined" style={{ color: accent }}>checklist</span>
        {block.title || 'To-Do'}
        {items.length > 0 && (
          <span className="text-xs text-on-surface-variant/60 ml-auto font-normal">
            {items.filter((i) => i.done).length}/{items.length}
          </span>
        )}
      </h4>

      {/* List */}
      <ul className="flex-1 overflow-y-auto space-y-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 group">
            {/* Checkbox */}
            <button
              onClick={() => toggleItem(item.id)}
              className={`w-6 h-6 flex-shrink-0 rounded flex items-center justify-center transition-colors ${
                item.done
                  ? 'text-white'
                  : 'border-2 border-outline-variant hover:border-primary'
              }`}
              style={item.done ? { backgroundColor: accent } : undefined}
            >
              {item.done && (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
            </button>
            <span
              className={`flex-1 transition-all ${
                item.done
                  ? 'text-on-surface-variant line-through opacity-60'
                  : 'text-on-surface font-medium'
              }`}
            >
              {item.text}
            </span>
            <button
              onClick={() => deleteItem(item.id)}
              className="text-on-surface-variant/30 hover:text-error text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant/40 text-sm">
          No tasks yet
        </div>
      )}

      {/* Add input */}
      <div className="flex items-center gap-2 border border-outline-variant rounded-xl px-3 py-2 bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary mt-4">
        <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">add</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
        />
      </div>
    </div>
  );
}
