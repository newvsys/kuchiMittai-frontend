// Shown automatically by Next.js App Router while the search server component is fetching
export default function SearchLoading() {
  return (
    <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5">

      <div className="grid grid-cols-[200px_1fr] gap-x-10 max-md:grid-cols-1 max-md:gap-y-5 pt-10">
        {/* Filters skeleton */}
        <div className="space-y-4 animate-pulse">
          <div className="h-7 w-24 bg-gray-200 rounded" />
          <div className="h-px bg-gray-200" />
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-px bg-gray-200" />
          <div className="h-5 w-24 bg-gray-200 rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 w-32 bg-gray-200 rounded" />
          ))}
          <div className="h-px bg-gray-200" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-8 w-full bg-gray-200 rounded" />
        </div>

        {/* Products grid skeleton */}
        <div>
          <div className="flex justify-between items-center py-10">
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="bg-gray-200 rounded-lg aspect-square" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
