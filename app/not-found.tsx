import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2
        className="text-2xl font-bold"
        style={{ color: 'var(--color-sage-text)' }}
      >
        Page not found
      </h2>
      <p style={{ color: 'var(--color-sage-muted)' }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: 'var(--color-sage-300)' }}
      >
        Go back home
      </Link>
    </div>
  );
}
