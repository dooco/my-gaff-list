import { HomeIcon, UserIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

interface RoleBadgeProps {
  userType: 'landlord' | 'tenant' | 'agent' | string;
  size?: 'sm' | 'md';
}

export default function RoleBadge({ userType, size = 'sm' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1'
  };

  const getRoleConfig = () => {
    switch (userType) {
      case 'landlord':
        return {
          label: 'Landlord',
          icon: HomeIcon,
          className: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      case 'agent':
        return {
          label: 'Agent',
          icon: BriefcaseIcon,
          className: 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case 'tenant':
      case 'renter':
        return {
          label: 'Tenant',
          icon: UserIcon,
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      default:
        return {
          label: 'User',
          icon: UserIcon,
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${sizeClasses[size]}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}