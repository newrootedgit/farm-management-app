import { useMemo } from 'react';
import type { Task } from '@farm/shared';

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
  showCompleted: boolean;
}

export default function SeedingView({ tasks, onTaskClick, showCompleted }: SeedingViewProps) {
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
      if (!showCompleted && t.status === 'COMPLETED') return false;
      return true;
    });
  }, [tasks, showCompleted]);

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
        // Pending first, then by customer name
        if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
        if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
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
        if (t.status === 'COMPLETED') return false;
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

  const pendingCount = todaySeeding.filter((t) => t.status !== 'COMPLETED').length;
  const completedCount = todaySeeding.filter((t) => t.status === 'COMPLETED').length;

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
              const customerName = task.orderItem?.order?.customer || 'Walk-in';

              return (
                <div
                  key={task.id}
                  onClick={() => !isCompleted && onTaskClick(task)}
                  className={`border rounded-lg p-4 bg-card transition-all ${
                    isCompleted
                      ? 'opacity-60 border-green-200 bg-green-50'
                      : `${SEED_STYLE.border} ${SEED_STYLE.hoverBorder} hover:shadow-md cursor-pointer`
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isCompleted
                          ? 'bg-green-100 text-green-800'
                          : `${SEED_STYLE.bg} ${SEED_STYLE.text}`
                      }`}
                    >
                      {isCompleted ? 'Completed' : 'Seed'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {task.orderItem?.order?.orderNumber}
                    </span>
                  </div>

                  {/* Product Name */}
                  <h3 className={`font-semibold text-lg mb-2 ${isCompleted ? 'line-through' : ''}`}>
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
