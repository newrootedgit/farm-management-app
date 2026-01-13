import { useMemo } from 'react';
import type { Task } from '@farm/shared';

// Helper function to check if a task is overdue
// Tasks are overdue if past due AND either not completed or completed without log data
const isOverdue = (task: Task): boolean => {
  if (!task.dueDate) return false;
  if (task.status === 'CANCELLED') return false;

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(23, 59, 59, 999);
  const isPastDue = dueDate < new Date();

  if (!isPastDue) return false;
  if (task.status !== 'COMPLETED') return true;
  if (!task.completedBy) return true; // Completed but missing log data

  return false;
};

// Earth tone styles (differentiated from competitor)
const SEED_STYLE = {
  bg: 'bg-emerald-100',
  text: 'text-emerald-800',
  border: 'border-emerald-200',
  hoverBorder: 'hover:border-emerald-400',
};

interface SeedingViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onViewLog?: (task: Task) => void;
  showCompleted: boolean;
  showOverdue?: boolean;
}

export default function SeedingView({ tasks, onTaskClick, onViewLog, showCompleted, showOverdue = true }: SeedingViewProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const sevenDaysOut = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  // Filter to only SEED tasks
  const seedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.type !== 'SEED') return false;
      // Only hide tasks that are FULLY completed (have log data)
      const isFullyComplete = t.status === 'COMPLETED' && t.completedBy;
      if (!showCompleted && isFullyComplete) return false;
      if (!showOverdue && isOverdue(t)) return false;
      return true;
    });
  }, [tasks, showCompleted, showOverdue]);

  // Today's seeding tasks
  const todaySeeding = useMemo(() => {
    return seedTasks
      .filter((t) => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < todayEnd;
      })
      .sort((a, b) => {
        // Fully completed tasks last, then by customer name
        const aFullyComplete = a.status === 'COMPLETED' && a.completedBy;
        const bFullyComplete = b.status === 'COMPLETED' && b.completedBy;
        if (aFullyComplete && !bFullyComplete) return 1;
        if (!aFullyComplete && bFullyComplete) return -1;
        const customerA = a.orderItem?.order?.customer || '';
        const customerB = b.orderItem?.order?.customer || '';
        return customerA.localeCompare(customerB);
      });
  }, [seedTasks, today, todayEnd]);

  // Upcoming seeding (next 7 days, excluding today)
  const upcomingSeeding = useMemo(() => {
    return seedTasks
      .filter((t) => {
        if (!t.dueDate) return false;
        // Only exclude tasks that are fully completed (have log data)
        const isFullyComplete = t.status === 'COMPLETED' && t.completedBy;
        if (isFullyComplete) return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= todayEnd && dueDate < sevenDaysOut;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [seedTasks, todayEnd, sevenDaysOut]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Count tasks that are not fully complete (need logs filled out)
  const pendingCount = todaySeeding.filter((t) => !(t.status === 'COMPLETED' && t.completedBy)).length;
  // Count tasks that are fully complete (have logs)
  const completedCount = todaySeeding.filter((t) => t.status === 'COMPLETED' && t.completedBy).length;

  // Overdue seeding tasks
  const overdueSeeding = useMemo(() => {
    return seedTasks
      .filter((t) => isOverdue(t))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [seedTasks]);

  // Calculate total trays for today
  const todayTotalTrays = todaySeeding
    .filter((t) => t.status !== 'COMPLETED')
    .reduce((sum, t) => sum + (t.orderItem?.traysNeeded || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1.5 rounded-lg ${SEED_STYLE.bg} ${SEED_STYLE.text} font-medium`}>
            Seeding
          </div>
          {todayTotalTrays > 0 && (
            <span className="text-sm text-muted-foreground">
              Total today: <span className="font-semibold text-foreground">{todayTotalTrays} trays</span>
            </span>
          )}
        </div>
      </div>

      {/* Overdue Seeding */}
      {overdueSeeding.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">⚠️ Overdue Seeding</h2>
            <span className="text-sm text-red-600 dark:text-red-400">
              {overdueSeeding.length} overdue
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overdueSeeding.map((task) => {
              const customerName = task.orderItem?.order?.customer || 'Walk-in';
              const daysOverdue = Math.floor((new Date().getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="border-2 border-red-400 rounded-lg p-4 bg-red-50 dark:bg-red-950/30 hover:border-red-500 hover:shadow-md cursor-pointer transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                      ⚠️ OVERDUE ({daysOverdue}d)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {task.orderItem?.order?.orderNumber}
                    </span>
                  </div>

                  {/* Product Name */}
                  <h3 className="font-semibold text-lg mb-2">
                    {task.orderItem?.product?.name || 'Unknown Product'}
                  </h3>

                  {/* Customer */}
                  <p className="text-sm text-muted-foreground mb-3">{customerName}</p>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="text-xs text-red-600 dark:text-red-400">
                      Due: {new Date(task.dueDate!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex gap-4">
                      <span>
                        <span className="text-muted-foreground">Trays:</span>{' '}
                        <strong>{task.orderItem?.traysNeeded || '—'}</strong>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Qty:</span>{' '}
                        <strong>{task.orderItem?.quantityOz || '—'} oz</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Seeding */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Today's Seeding</h2>
          <span className="text-sm text-muted-foreground">
            {pendingCount} pending{completedCount > 0 && ` · ${completedCount} done`}
          </span>
        </div>

        {todaySeeding.length === 0 ? (
          <div className="border rounded-lg p-8 bg-card text-center">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="font-medium">No seeding scheduled today</h3>
            <p className="text-sm text-muted-foreground">
              Seeding tasks will appear here when orders are due.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySeeding.map((task) => {
              const isCompleted = task.status === 'COMPLETED';
              const isFullyComplete = isCompleted && task.completedBy;
              const taskIsOverdue = isOverdue(task);
              const customerName = task.orderItem?.order?.customer || 'Walk-in';

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    if (isFullyComplete && onViewLog) {
                      onViewLog(task);
                    } else {
                      onTaskClick(task);
                    }
                  }}
                  className={`border rounded-lg p-4 bg-card transition-all cursor-pointer ${
                    taskIsOverdue
                      ? 'border-red-400 bg-red-50 dark:bg-red-950/30 hover:border-red-500 hover:shadow-md'
                      : isFullyComplete
                      ? 'opacity-70 hover:opacity-100 border-green-200 bg-green-50 hover:border-blue-300 hover:shadow-md'
                      : `${SEED_STYLE.border} ${SEED_STYLE.hoverBorder} hover:shadow-md`
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        taskIsOverdue
                          ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                          : isFullyComplete
                          ? 'bg-green-100 text-green-800'
                          : `${SEED_STYLE.bg} ${SEED_STYLE.text}`
                      }`}
                    >
                      {taskIsOverdue ? '⚠️ OVERDUE' : isFullyComplete ? 'Completed' : 'Seed'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {task.orderItem?.order?.orderNumber}
                    </span>
                  </div>

                  {/* Product Name */}
                  <h3 className={`font-semibold text-lg mb-2 ${isFullyComplete ? 'line-through' : ''}`}>
                    {task.orderItem?.product?.name || 'Unknown Product'}
                  </h3>

                  {/* Customer */}
                  <p className="text-sm text-muted-foreground mb-3">{customerName}</p>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-4">
                      <span>
                        <span className="text-muted-foreground">Trays:</span>{' '}
                        <strong>{task.orderItem?.traysNeeded || '—'}</strong>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Qty:</span>{' '}
                        <strong>{task.orderItem?.quantityOz || '—'} oz</strong>
                      </span>
                    </div>
                    {(task.orderItem?.product as { seedWeight?: number; seedUnit?: string } | undefined)?.seedWeight && (
                      <div className="flex gap-4 text-xs bg-muted/50 rounded px-2 py-1">
                        <span>
                          <span className="text-muted-foreground">Seed/tray:</span>{' '}
                          <strong>
                            {(task.orderItem?.product as { seedWeight?: number })?.seedWeight}{' '}
                            {(task.orderItem?.product as { seedUnit?: string })?.seedUnit || 'g'}
                          </strong>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Total:</span>{' '}
                          <strong>
                            {((task.orderItem?.product as { seedWeight?: number })?.seedWeight || 0) * (task.orderItem?.traysNeeded || 0)}{' '}
                            {(task.orderItem?.product as { seedUnit?: string })?.seedUnit || 'g'}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Completion info */}
                  {isCompleted && task.completedBy && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Completed by {task.completedBy}
                      {task.actualTrays && ` · ${task.actualTrays} trays`}
                      {task.seedLot && ` · Lot: ${task.seedLot}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Seeding */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Upcoming Seeding (7 Days)</h2>

        {upcomingSeeding.length === 0 ? (
          <div className="border rounded-lg p-6 bg-card text-center text-muted-foreground">
            No seeding scheduled in the next 7 days.
          </div>
        ) : (
          <div className="border rounded-lg bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-sm font-medium">Product</th>
                  <th className="text-left px-4 py-2 text-sm font-medium">Customer</th>
                  <th className="text-right px-4 py-2 text-sm font-medium">Trays</th>
                  <th className="text-right px-4 py-2 text-sm font-medium">Qty (oz)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {upcomingSeeding.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{formatDate(String(task.dueDate))}</td>
                    <td className="px-4 py-3 font-medium">
                      {task.orderItem?.product?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {task.orderItem?.order?.customer || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {task.orderItem?.traysNeeded || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{task.orderItem?.quantityOz || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
