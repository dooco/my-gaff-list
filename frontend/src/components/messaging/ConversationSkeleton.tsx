export default function ConversationSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {/* Avatar skeleton */}
            <div className="h-10 w-10 bg-gray-200 rounded-full mr-3" />
            <div className="flex-1">
              {/* Name skeleton */}
              <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
              {/* Property title skeleton */}
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="text-right">
              {/* Time skeleton */}
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
          </div>
          {/* Message preview skeleton */}
          <div className="ml-13">
            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
      {[...Array(5)].map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}