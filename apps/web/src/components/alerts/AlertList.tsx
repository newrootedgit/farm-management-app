import { AlertItem, AlertItemSkeleton } from './AlertItem';
import type { Alert } from '@/hooks/useAlerts';

interface AlertListProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  isLoading?: boolean;
  compact?: boolean;
  maxItems?: number;
  emptyMessage?: string;
}

export function AlertList({
  alerts,
  onDismiss,
  isLoading = false,
  compact = false,
  maxItems,
  emptyMessage = 'No alerts',
}: AlertListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <AlertItemSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;
  const hasMore = maxItems && alerts.length > maxItems;

  if (displayAlerts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayAlerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
          compact={compact}
        />
      ))}
      {hasMore && (
        <p className="text-xs text-center text-muted-foreground py-2">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
}

interface GroupedAlertListProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  isLoading?: boolean;
}

export function GroupedAlertList({
  alerts,
  onDismiss,
  isLoading = false,
}: GroupedAlertListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-5 bg-muted rounded w-24 mb-2" />
          <AlertItemSkeleton />
        </div>
        <div>
          <div className="h-5 bg-muted rounded w-24 mb-2" />
          <AlertItemSkeleton />
        </div>
      </div>
    );
  }

  const critical = alerts.filter((a) => a.priority === 1);
  const warnings = alerts.filter((a) => a.priority === 2);
  const info = alerts.filter((a) => a.priority === 3);

  if (alerts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No alerts - you're all caught up!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Critical ({critical.length})
          </h3>
          <div className="space-y-2">
            {critical.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Warnings ({warnings.length})
          </h3>
          <div className="space-y-2">
            {warnings.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
            ))}
          </div>
        </div>
      )}

      {info.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Info ({info.length})
          </h3>
          <div className="space-y-2">
            {info.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
