'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
  countdown?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<Toast['type'], string> = {
  error: 'error_outline',
  warning: 'warning',
  info: 'info',
  success: 'check_circle',
};

const TYPE_STYLES: Record<Toast['type'], string> = {
  error: 'border-error/30 text-error',
  warning: 'border-orange-400/30 text-orange-500 dark:text-orange-400',
  info: 'border-primary/30 text-primary',
  success: 'border-green-600/30 text-green-600 dark:text-green-400',
};

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [countdown, setCountdown] = useState(toast.countdown ?? 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const duration = toast.duration ?? 5000;
  const isRateLimit = countdown > 0;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, isRateLimit ? countdown * 1000 : duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, duration, countdown, isRateLimit]);

  useEffect(() => {
    if (!isRateLimit) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isRateLimit]);

  const baseTransform = visible && !exiting
    ? 'translate-x-0 opacity-100'
    : 'translate-x-full opacity-0';

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 w-80 px-4 py-3 rounded-2xl border',
        'bg-surface-container/80 backdrop-blur-xl',
        'shadow-lg shadow-on-surface/5',
        'transition-all duration-300 ease-out',
        baseTransform,
        TYPE_STYLES[toast.type],
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-xl mt-0.5 shrink-0">
        {ICON_MAP[toast.type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface leading-snug">
          {toast.message}
        </p>
        {isRateLimit && countdown > 0 && (
          <p className="text-xs text-on-surface-variant mt-1">
            Retry in {countdown}s
          </p>
        )}
      </div>

      <button
        onClick={dismiss}
        className="shrink-0 p-0.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
