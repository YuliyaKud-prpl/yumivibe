'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardSummary } from '@/types/dashboard';

interface DashboardCardProps {
  dashboard: DashboardSummary;
  onDelete?: (id: string) => void;
}

interface GradientConfig {
  from: string;
  to: string;
  icon: string;
  iconColor: string;
}

function getGradientConfig(name: string): GradientConfig {
  const lower = name.toLowerCase();
  if (lower.includes('morning')) {
    return { from: '#F3E4C9', to: '#A98B76', icon: 'wb_sunny', iconColor: '#A98B76' };
  }
  if (lower.includes('work') || lower.includes('focus')) {
    return { from: '#9CD5FF', to: '#355872', icon: 'work', iconColor: '#355872' };
  }
  if (lower.includes('chill') || lower.includes('music')) {
    return { from: '#519A66', to: '#FFD786', icon: 'music_note', iconColor: '#519A66' };
  }
  return { from: '#A1BC98', to: '#778873', icon: 'dashboard', iconColor: '#778873' };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function DashboardCard({ dashboard, onDelete }: DashboardCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();
  const config = getGradientConfig(dashboard.name);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(dashboard.id);
    setConfirmingDelete(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDelete(false);
  };

  const handleNavigate = () => {
    if (navigating || confirmingDelete) return;
    setNavigating(true);
    router.push(`/dashboard/${dashboard.id}`);
  };

  return (
    <div
      onClick={handleNavigate}
      className={`group bg-surface-container-lowest p-4 rounded-[1rem] shadow-[0_20px_40px_rgba(82,99,79,0.06)] hover:shadow-[0_30px_60px_rgba(82,99,79,0.12)] transition-all duration-500 hover:-translate-y-2 cursor-pointer border border-transparent hover:border-outline-variant/20 block animate-[fadeInUp_0.4s_ease-out] ${navigating ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {/* Loading overlay */}
      {navigating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-lowest/60 rounded-[1rem]">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      )}

      {/* Gradient thumbnail */}
      <div className="h-48 rounded-lg mb-6 overflow-hidden relative">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom right, ${config.from}, ${config.to})`,
          }}
        />
        <div className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-md w-10 h-10 flex items-center justify-center rounded-full shadow-sm">
          <span
            className="material-symbols-outlined"
            style={{
              color: config.iconColor,
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {config.icon}
          </span>
        </div>

        {/* Delete button */}
        {onDelete && !confirmingDelete && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-lowest/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:bg-error hover:text-white"
            aria-label="Delete dashboard"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}

        {/* Delete confirmation */}
        {onDelete && confirmingDelete && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-bold text-error mr-1">Delete?</span>
            <button
              onClick={handleConfirmDelete}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-error/10 text-error"
              aria-label="Confirm delete"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
            <button
              onClick={handleCancelDelete}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant"
              aria-label="Cancel delete"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-2">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-on-surface">
            {dashboard.name}
          </h3>
          <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
            arrow_forward
          </span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="bg-sage-100 text-sage-text text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {dashboard.blockCount} {dashboard.blockCount === 1 ? 'block' : 'blocks'}
          </span>
        </div>
        <p className="text-sm text-sage-muted">
          Updated {timeAgo(dashboard.updatedAt)}
        </p>
      </div>
    </div>
  );
}
