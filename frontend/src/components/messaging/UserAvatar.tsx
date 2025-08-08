import { UserIcon } from '@heroicons/react/24/outline';

interface UserAvatarProps {
  user: {
    first_name?: string;
    last_name?: string;
    email: string;
    profile_image?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  isOnline?: boolean;
}

export default function UserAvatar({ user, size = 'md', showOnline = false, isOnline = false }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const getBackgroundColor = () => {
    // Generate consistent color based on email
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500'
    ];
    const index = user.email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="relative">
      {user.profile_image ? (
        <img
          src={user.profile_image}
          alt={`${user.first_name} ${user.last_name}`}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} ${getBackgroundColor()} text-white rounded-full flex items-center justify-center font-medium`}>
          {getInitials()}
        </div>
      )}
      
      {showOnline && (
        <div className={`absolute bottom-0 right-0 ${size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'} ${isOnline ? 'bg-green-400' : 'bg-gray-300'} border-2 border-white rounded-full`} />
      )}
    </div>
  );
}