'use client';

import { type ReactNode } from 'react';

interface BlockWrapperProps {
  title: string;
  onDelete: () => void;
  accentColor?: string;
  children: ReactNode;
}

export function BlockWrapper({ title, onDelete, children }: BlockWrapperProps) {
  return (
    <div className="group relative flex h-full w-full flex-col rounded-2xl bg-surface-container-lowest shadow-[0_20px_40px_rgba(112,67,39,0.06)]">
      {/* Hover overlay: drag handle + close button — inside card, top-right */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div
          className="drag-handle flex cursor-grab items-center text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
          aria-label="Drag to reorder"
        >
          <span className="material-symbols-outlined text-[12px]">drag_indicator</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center text-on-surface-variant/40 cursor-pointer hover:text-on-surface-variant transition-colors"
          aria-label={`Delete ${title} block`}
        >
          <span className="material-symbols-outlined text-[12px]">close</span>
        </button>
      </div>

      {/* Block content */}
      <div className="flex-1 overflow-hidden rounded-2xl">
        {children}
      </div>
    </div>
  );
}
