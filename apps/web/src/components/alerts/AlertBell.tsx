import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useAlertStore } from '@/stores/alert-store';
import { useFarmStore } from '@/stores/farm-store';
import { AlertList } from './AlertList';

export function AlertBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { currentFarmId } = useFarmStore();
  const { alerts, criticalCount, totalCount, unreadCount, isLoading } = useAlerts(
    currentFarmId ?? undefined
  );
  const { dismissAlert, dismissMultiple, updateLastSeen } = useAlertStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Update last seen when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updateLastSeen();
    }
  }, [isOpen, updateLastSeen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleDismissAll = () => {
    dismissMultiple(alerts.map((a) => a.id));
  };

  const showBadge = totalCount > 0;
  const badgeColor = criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-md hover:bg-accent transition-colors ${
          isOpen ? 'bg-accent' : ''
        }`}
        aria-label={`Notifications${totalCount > 0 ? ` (${totalCount} alerts)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {showBadge && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full ${badgeColor}`}
          >
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[calc(100vh-120px)] bg-card border rounded-lg shadow-lg z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold">
              Alerts
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({totalCount})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              {alerts.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="p-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                  title="Dismiss all"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto p-3">
            <AlertList
              alerts={alerts}
              onDismiss={dismissAlert}
              isLoading={isLoading}
              compact
              maxItems={10}
              emptyMessage="No alerts - you're all caught up!"
            />
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="border-t px-4 py-2">
              <Link
                to="/operations"
                onClick={() => setIsOpen(false)}
                className="text-sm text-primary hover:underline"
              >
                View all in Operations →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
