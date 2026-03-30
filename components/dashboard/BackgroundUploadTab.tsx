'use client';

import { useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface BackgroundUploadTabProps {
  onBackgroundChange: (background: string, backgroundType: 'image') => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

interface FilePreview {
  name: string;
  size: number;
  dataUrl: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackgroundUploadTab({ onBackgroundChange }: BackgroundUploadTabProps) {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${formatFileSize(file.size)}). Max 5MB.`);
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview({ name: file.name, size: file.size, dataUrl });
      setLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (preview) {
      onBackgroundChange(preview.dataUrl, 'image');
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        className="hidden"
        id="bg-upload-input"
      />

      {!preview && (
        <label
          htmlFor="bg-upload-input"
          className={`
            flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6
            cursor-pointer transition-colors
            ${isDark
              ? 'border-white/20 hover:border-white/40 hover:bg-white/5'
              : 'border-outline-variant hover:border-primary hover:bg-primary/5'
            }
          `}
        >
          <span className="material-symbols-outlined text-3xl text-on-surface-variant">
            upload_file
          </span>
          <span className="text-sm font-medium text-on-surface-variant">
            Click to upload an image
          </span>
          <span className="text-xs text-on-surface-variant/60">
            JPG, PNG, or WebP -- Max 5MB
          </span>
        </label>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <span className="material-symbols-outlined animate-spin text-on-surface-variant">
            progress_activity
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {preview && !loading && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-outline-variant/30">
            <img
              src={preview.dataUrl}
              alt="Upload preview"
              className="h-32 w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-base">image</span>
            <span className="truncate">{preview.name}</span>
            <span className="ml-auto shrink-0">{formatFileSize(preview.size)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className={`
                flex-1 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors
                ${isDark
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-primary text-on-primary hover:bg-primary/90'
                }
              `}
            >
              Apply
            </button>
            <button
              onClick={handleClear}
              className={`
                rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors
                ${isDark
                  ? 'text-on-surface-variant hover:bg-white/10'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
                }
              `}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
