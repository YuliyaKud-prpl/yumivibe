interface BlockErrorProps {
  onRetry?: () => void;
}

export function BlockError({ onRetry }: BlockErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4 bg-surface-container rounded-2xl">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">
        error_outline
      </span>
      <p className="text-sm text-on-surface-variant font-medium">
        Something went wrong
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
