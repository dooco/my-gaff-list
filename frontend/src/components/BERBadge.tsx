interface BERBadgeProps {
  rating: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getBERColor = (rating: string): string => {
  if (!rating) return 'bg-gray-400 text-white';
  
  const normalizedRating = rating.toUpperCase();
  
  if (normalizedRating.startsWith('A')) {
    return 'bg-green-800 text-white'; // Dark green for A1-A3
  } else if (normalizedRating.startsWith('B')) {
    return 'bg-green-600 text-white'; // Light green for B1-B3
  } else if (normalizedRating.startsWith('C')) {
    return 'bg-yellow-500 text-black'; // Yellow for C1-C3
  } else if (normalizedRating.startsWith('D')) {
    return 'bg-orange-500 text-white'; // Orange for D1-D2
  } else if (normalizedRating.startsWith('E')) {
    return 'bg-red-600 text-white'; // Red for E1-E2
  } else if (normalizedRating === 'F') {
    return 'bg-red-800 text-white'; // Dark red for F
  } else if (normalizedRating === 'G') {
    return 'bg-red-900 text-white'; // Maroon for G
  } else if (normalizedRating === 'EXEMPT') {
    return 'bg-gray-500 text-white'; // Grey for exempt
  }
  
  return 'bg-gray-400 text-white'; // Default
};

const getSizeClasses = (size: 'sm' | 'md' | 'lg'): string => {
  switch (size) {
    case 'sm':
      return 'px-1.5 py-0.5 text-xs min-w-[28px] h-5';
    case 'lg':
      return 'px-3 py-1.5 text-base min-w-[40px] h-8';
    default:
      return 'px-2 py-1 text-sm min-w-[32px] h-6';
  }
};

export default function BERBadge({ rating, size = 'md', className = '' }: BERBadgeProps) {
  if (!rating) return null;

  const colorClasses = getBERColor(rating);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`
        inline-flex items-center justify-center font-bold rounded
        ${colorClasses} ${sizeClasses} ${className}
      `}
      title={`BER Rating: ${rating}`}
    >
      {rating}
    </div>
  );
}