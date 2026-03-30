'use client';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2
        className="text-2xl font-bold"
        style={{ color: 'var(--color-sage-text)' }}
      >
        Something went wrong
      </h2>
      <p
        className="max-w-md text-center text-sm"
        style={{ color: 'var(--color-sage-muted)' }}
      >
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: 'var(--color-sage-300)' }}
      >
        Try Again
      </button>
    </div>
  );
}
