import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { usePriorityTasks } from '@/hooks/useAlerts';
import { useFarmStore } from '@/stores/farm-store';

// Task type styles
const TASK_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SOAK: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Soak' },
  SEED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Seed' },
  MOVE_TO_LIGHT: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Light' },
  HARVESTING: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Harvest' },
};

interface TaskCardProps {
  task: any;
  variant: 'overdue' | 'due_today';
}

function TaskCard({ task, variant }: TaskCardProps) {
  const style = TASK_TYPE_STYLES[task.type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: task.type };
  const productName = task.orderItem?.product?.name || task.title || 'Unknown';
  const customer = task.orderItem?.order?.customer ?? task.orderItem?.order?.customerName;
  const orderNumber = task.orderItem?.order?.orderNumber;

  // Format relative date for overdue tasks
  const formatOverdue = (date: string) => {
    const dueDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  };

  return (
    <Link
      to="/operations"
      className={`block p-3 rounded-lg border transition-colors hover:border-primary ${
        variant === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            {orderNumber && (
              <span className="text-xs text-muted-foreground">#{orderNumber}</span>
            )}
          </div>
          <p className="font-medium text-sm truncate">{productName}</p>
          {customer && (
            <p className="text-xs text-muted-foreground truncate">{customer}</p>
          )}
          {variant === 'overdue' && task.dueDate && (
            <p className="text-xs text-red-600 mt-1">Due {formatOverdue(task.dueDate)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PriorityPanel() {
  const { currentFarmId } = useFarmStore();
  const { overdueTasks, dueTodayTasks, isLoading } = usePriorityTasks(currentFarmId ?? undefined);

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-card p-4">
        <div className="h-5 bg-muted rounded w-32 mb-4 animate-pulse" />
        <div className="space-y-2">
          <div className="h-20 bg-muted rounded animate-pulse" />
          <div className="h-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const hasOverdue = overdueTasks.length > 0;
  const hasDueToday = dueTodayTasks.length > 0;
  const isEmpty = !hasOverdue && !hasDueToday;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Needs Attention
        </h2>
      </div>

      {isEmpty ? (
        <div className="p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">All caught up! No urgent tasks.</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Overdue Section */}
          {hasOverdue && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <h3 className="text-sm font-medium text-red-700">
                  Overdue ({overdueTasks.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {overdueTasks.slice(0, 5).map((task) => (
                  <TaskCard key={task.id} task={task} variant="overdue" />
                ))}
                {overdueTasks.length > 5 && (
                  <Link
                    to="/operations"
                    className="block text-xs text-center text-red-600 hover:underline py-1"
                  >
                    +{overdueTasks.length - 5} more overdue
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {hasDueToday && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-sm font-medium text-amber-700">
                  Due Today ({dueTodayTasks.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {dueTodayTasks.slice(0, 5).map((task) => (
                  <TaskCard key={task.id} task={task} variant="due_today" />
                ))}
                {dueTodayTasks.length > 5 && (
                  <Link
                    to="/operations"
                    className="block text-xs text-center text-amber-600 hover:underline py-1"
                  >
                    +{dueTodayTasks.length - 5} more due today
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isEmpty && (
        <div className="px-4 py-2 border-t bg-muted/20">
          <Link to="/operations" className="text-xs text-primary hover:underline">
            View all in Operations →
          </Link>
        </div>
      )}
    </div>
  );
}
