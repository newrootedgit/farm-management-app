import { useMemo } from 'react';
import type { Task } from '@farm/shared';

// Earth tone styles (differentiated from competitor)
const TRANSPLANT_STYLE = {
  bg: 'bg-amber-100',
  text: 'text-amber-800',
  border: 'border-amber-200',
  hoverBorder: 'hover:border-amber-400',
};

interface TransplantViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted: boolean;
}

export default function TransplantView({ tasks, onTaskClick, showCompleted }: TransplantViewProps) {
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

  // Filter to only MOVE_TO_LIGHT tasks
  const transplantTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.type !== 'MOVE_TO_LIGHT') return false;
      if (!showCompleted && t.status === 'COMPLETED') return false;
      return true;
    });
  }, [tasks, showCompleted]);

  // Today's transplant tasks
  const todayTransplant = useMemo(() => {
    return transplantTasks
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
  }, [transplantTasks, today, todayEnd]);

  // Upcoming transplant (next 7 days, excluding today)
  const upcomingTransplant = useMemo(() => {
    return transplantTasks
      .filter((t) => {
        if (!t.dueDate) return false;
        if (t.status === 'COMPLETED') return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= todayEnd && dueDate < sevenDaysOut;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [transplantTasks, todayEnd, sevenDaysOut]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const pendingCount = todayTransplant.filter((t) => t.status !== 'COMPLETED').length;
  const completedCount = todayTransplant.filter((t) => t.status === 'COMPLETED').length;

  // Calculate total trays for today
  const todayTotalTrays = todayTransplant
    .filter((t) => t.status !== 'COMPLETED')
    .reduce((sum, t) => sum + (t.orderItem?.traysNeeded || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1.5 rounded-lg ${TRANSPLANT_STYLE.bg} ${TRANSPLANT_STYLE.text} font-medium`}>
            Transplant to Light
          </div>
          {todayTotalTrays > 0 && (
            <span className="text-sm text-muted-foreground">
              Total today: <span className="font-semibold text-foreground">{todayTotalTrays} trays</span>
            </span>
          )}
        </div>
      </div>

      {/* Today's Transplant */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Today's Transplants</h2>
          <span className="text-sm text-muted-foreground">
            {pendingCount} pending{completedCount > 0 && ` · ${completedCount} done`}
          </span>
        </div>

        {todayTransplant.length === 0 ? (
          <div className="border rounded-lg p-8 bg-card text-center">
            <div className="text-4xl mb-3">☀️</div>
            <h3 className="font-medium">No transplants scheduled today</h3>
            <p className="text-sm text-muted-foreground">
              Transplant tasks will appear here when trays are ready to move to light.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTransplant.map((task) => {
              const isCompleted = task.status === 'COMPLETED';
              const customerName = task.orderItem?.order?.customer || 'Walk-in';

              return (
                <div
                  key={task.id}
                  onClick={() => !isCompleted && onTaskClick(task)}
                  className={`border rounded-lg p-4 bg-card transition-all ${
                    isCompleted
                      ? 'opacity-60 border-green-200 bg-green-50'
                      : `${TRANSPLANT_STYLE.border} ${TRANSPLANT_STYLE.hoverBorder} hover:shadow-md cursor-pointer`
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isCompleted
                          ? 'bg-green-100 text-green-800'
                          : `${TRANSPLANT_STYLE.bg} ${TRANSPLANT_STYLE.text}`
                      }`}
                    >
                      {isCompleted ? 'Completed' : 'Move to Light'}
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
                  <div className="flex items-center justify-between text-sm">
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

                  {/* Completion info */}
                  {isCompleted && task.completedBy && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Completed by {task.completedBy}
                      {task.actualTrays && ` · ${task.actualTrays} trays`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Transplants */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Upcoming Transplants (7 Days)</h2>

        {upcomingTransplant.length === 0 ? (
          <div className="border rounded-lg p-6 bg-card text-center text-muted-foreground">
            No transplants scheduled in the next 7 days.
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
                {upcomingTransplant.map((task) => (
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
