import { Link } from 'react-router-dom';
import { X, AlertTriangle, Clock, Package } from 'lucide-react';
import type { Alert } from '@/hooks/useAlerts';

interface AlertItemProps {
  alert: Alert;
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

const ALERT_STYLES = {
  overdue: {
    bg: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    Icon: AlertTriangle,
    label: 'Overdue',
  },
  due_today: {
    bg: 'bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    Icon: Clock,
    label: 'Due Today',
  },
  low_stock: {
    bg: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
    Icon: Package,
    label: 'Low Stock',
  },
};

export function AlertItem({ alert, onDismiss, compact = false }: AlertItemProps) {
  const style = ALERT_STYLES[alert.type];
  const Icon = style.Icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg}`}>
        <div className={`p-1.5 rounded-full ${style.iconBg}`}>
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.title}</p>
          <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1 hover:bg-black/5 rounded transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${style.iconBg} shrink-0`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
              {style.label}
            </span>
            {alert.meta?.orderNumber && (
              <span className="text-xs text-muted-foreground">
                #{alert.meta.orderNumber}
              </span>
            )}
          </div>
          <h4 className="font-medium text-sm">{alert.title}</h4>
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          {alert.meta?.customer && (
            <p className="text-xs text-muted-foreground mt-1">
              Customer: {alert.meta.customer}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Link
              to={alert.actionUrl}
              className="px-3 py-1.5 text-xs font-medium bg-white border rounded-md hover:bg-gray-50 transition-colors"
            >
              {alert.actionLabel}
            </Link>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1 hover:bg-black/5 rounded transition-colors shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AlertItemSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-muted/30 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-7 bg-muted rounded w-24 mt-3" />
        </div>
      </div>
    </div>
  );
}
