import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ShoppingCart, 
  Package, 
  CheckSquare,
  LucideIcon
} from 'lucide-react';

interface StatusConfig {
  color: string;
  icon: LucideIcon;
  label: string;
}

const statusConfig: Record<string, StatusConfig> = {
  Draft: {
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: FileText,
    label: 'Draft'
  },
  Pending: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: Clock,
    label: 'Pending Approval'
  },
  Approved: {
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: CheckCircle,
    label: 'Approved'
  },
  Rejected: {
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
    label: 'Rejected'
  },
  Ordered: {
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: ShoppingCart,
    label: 'Ordered'
  },
  Received: {
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    icon: Package,
    label: 'Received'
  },
  Completed: {
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckSquare,
    label: 'Completed'
  }
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge = ({ status, showIcon = true, size = 'md' }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.Draft;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.color} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {config.label}
    </span>
  );
};

export const getStatusColor = (status: string) => {
  return statusConfig[status]?.color || statusConfig.Draft.color;
};

export default StatusBadge;
