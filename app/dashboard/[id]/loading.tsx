export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar skeleton */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-7 w-48 animate-pulse rounded-md bg-gray-200" />
        <div className="ml-auto h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-12 gap-4 p-4">
        <div className="col-span-4 h-40 animate-pulse rounded-xl bg-gray-200" />
        <div className="col-span-3 h-40 animate-pulse rounded-xl bg-gray-200" />
        <div className="col-span-5 h-56 animate-pulse rounded-xl bg-gray-200" />
        <div className="col-span-4 h-64 animate-pulse rounded-xl bg-gray-200" />
        <div className="col-span-4 h-48 animate-pulse rounded-xl bg-gray-200" />
        <div className="col-span-4 h-48 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}
