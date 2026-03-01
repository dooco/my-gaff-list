/**
 * CRITICAL-4: Global Loading State
 * Displayed during page transitions and data fetching.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {/* Spinner */}
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4" />
        
        <p className="text-gray-600 font-medium">Loading...</p>
        
        {/* Skeleton preview for content */}
        <div className="mt-8 w-80 mx-auto space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  );
}
