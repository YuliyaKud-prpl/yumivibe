'use client';

import { useState, useEffect } from 'react';

interface ErrorBannerProps {
  message: string;
  severity?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
}

const severityConfig = {
  error: {
    container: 'bg-error-container text-on-surface',
    icon: 'error',
    iconColor: 'text-error',
    retryBg: 'bg-error/10 hover:bg-error/20 text-error',
    dismissColor: 'text-on-surface/60 hover:text-on-surface',
  },
  warning: {
    container: 'bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100',
    icon: 'warning',
    iconColor: 'text-amber-700 dark:text-amber-300',
    retryBg: 'bg-amber-700/10 hover:bg-amber-700/20 text-amber-800 dark:text-amber-200',
    dismissColor: 'text-amber-900/60 hover:text-amber-900 dark:text-amber-200/60 dark:hover:text-amber-100',
  },
  info: {
    container: 'bg-blue-100 text-blue-950 dark:bg-blue-900/40 dark:text-blue-100',
    icon: 'info',
    iconColor: 'text-blue-700 dark:text-blue-300',
    retryBg: 'bg-blue-700/10 hover:bg-blue-700/20 text-blue-800 dark:text-blue-200',
    dismissColor: 'text-blue-900/60 hover:text-blue-900 dark:text-blue-200/60 dark:hover:text-blue-100',
  },
};

export function ErrorBanner({
  message,
  severity = 'error',
  onRetry,
  onDismiss,
}: ErrorBannerProps) {
  const [visible, setVisible] = useState(false);
  const config = severityConfig[severity];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  };

  return (
    <div
      className={`
        w-full rounded-2xl px-4 py-3 flex items-center gap-3
        transition-all duration-300 ease-out
        ${config.container}
        ${visible
          ? 'opacity-100 translate-y-0 max-h-24'
          : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden'}
      `}
      role="alert"
    >
      <span className={`material-symbols-outlined text-xl shrink-0 ${config.iconColor}`}>
        {config.icon}
      </span>

      <p className="flex-1 text-sm font-medium leading-snug">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className={`
            shrink-0 px-3 py-1.5 text-xs font-medium rounded-xl
            transition-colors ${config.retryBg}
          `}
        >
          Retry
        </button>
      )}

      {onDismiss && (
        <button
          onClick={handleDismiss}
          className={`
            shrink-0 p-1 rounded-full transition-colors
            ${config.dismissColor}
          `}
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  );
}
