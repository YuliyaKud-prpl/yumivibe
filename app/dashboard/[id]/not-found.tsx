import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard not found</h1>
      <p className="text-gray-500">
        The dashboard you are looking for does not exist or has been deleted.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
      >
        Back to Home
      </Link>
    </div>
  );
}
