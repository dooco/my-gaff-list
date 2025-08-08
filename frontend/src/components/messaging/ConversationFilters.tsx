import { FunnelIcon } from '@heroicons/react/24/outline';

interface ConversationFiltersProps {
  activeFilter: 'all' | 'unread' | 'landlords' | 'tenants';
  onFilterChange: (filter: 'all' | 'unread' | 'landlords' | 'tenants') => void;
  unreadCount: number;
}

export default function ConversationFilters({ activeFilter, onFilterChange, unreadCount }: ConversationFiltersProps) {
  const filters = [
    { key: 'all' as const, label: 'All', count: null },
    { key: 'unread' as const, label: 'Unread', count: unreadCount },
    { key: 'landlords' as const, label: 'Landlords', count: null },
    { key: 'tenants' as const, label: 'Tenants', count: null }
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <FunnelIcon className="h-5 w-5 text-gray-400" />
      <div className="flex gap-2">
        {filters.map(filter => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter.key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
            {filter.count !== null && filter.count > 0 && (
              <span className="ml-1 bg-white rounded-full px-1.5 py-0.5 text-xs">
                {filter.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}