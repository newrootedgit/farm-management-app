import { useState, useMemo } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useTasks, useCompleteTask } from '@/lib/api-client';
import type { Task } from '@farm/shared';

type ViewMode = 'all' | 'daily' | 'weekly' | 'monthly';

interface TaskLogFormData {
  completedBy: string;
  actualTrays: string;
  actualYieldOz: string;
  seedLot: string;
  completedDate: string;
  completedTime: string;
  completionNotes: string;
}

const getDefaultFormData = (): TaskLogFormData => {
  const now = new Date();
  return {
    completedBy: '',
    actualTrays: '',
    actualYieldOz: '',
    seedLot: '',
    completedDate: now.toISOString().split('T')[0],
    completedTime: now.toTimeString().slice(0, 5),
    completionNotes: '',
  };
};

export default function OperationsPage() {
  const { currentFarmId } = useFarmStore();
  const { data: tasks, isLoading } = useTasks(currentFarmId ?? undefined);
  const completeTask = useCompleteTask(currentFarmId ?? '');

  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [loggingTask, setLoggingTask] = useState<Task | null>(null);
  const [logForm, setLogForm] = useState<TaskLogFormData>(getDefaultFormData());
  const [logError, setLogError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm to view operations.</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Production task types
  const productionTaskTypes = ['SOAK', 'SEED', 'MOVE_TO_LIGHT', 'HARVESTING'];

  // Filter and sort tasks based on view mode
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks
      .filter((task) => {
        if (!productionTaskTypes.includes(task.type)) return false;
        if (!showCompleted && task.status === 'COMPLETED') return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, showCompleted]);

  // Get date range based on view mode
  const getDateRange = () => {
    const start = new Date(today);
    const end = new Date(today);

    switch (viewMode) {
      case 'daily':
        // Use selectedDate for daily view
        return { start: selectedDate, end: selectedDate };
      case 'weekly':
        end.setDate(end.getDate() + 7);
        return { start: today, end };
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        return { start: today, end };
      case 'all':
      default:
        return null; // No date filtering
    }
  };

  // Filter tasks by date range
  const tasksInRange = useMemo(() => {
    const range = getDateRange();
    if (!range) return filteredTasks;

    return filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate >= range.start && taskDate <= range.end;
    });
  }, [filteredTasks, viewMode, selectedDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasksInRange.forEach((task) => {
      if (!task.dueDate) return;
      const dateKey = new Date(task.dueDate).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    // Sort tasks within each date by type order
    const typeOrder = { SOAK: 0, SEED: 1, MOVE_TO_LIGHT: 2, HARVESTING: 3 };
    Object.values(grouped).forEach((dateTasks) => {
      dateTasks.sort((a, b) =>
        (typeOrder[a.type as keyof typeof typeOrder] ?? 4) -
        (typeOrder[b.type as keyof typeof typeOrder] ?? 4)
      );
    });

    return grouped;
  }, [tasksInRange]);

  // Get sorted date keys
  const sortedDateKeys = useMemo(() => {
    return Object.keys(tasksByDate).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [tasksByDate]);

  // Generate calendar navigation dates for daily view
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(today);
    start.setDate(start.getDate() - 3);

    for (let i = 0; i < 14; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Task count by date for calendar badges
  const taskCountByDate = useMemo(() => {
    const counts: Record<string, { pending: number; completed: number }> = {};

    tasks?.forEach((task) => {
      if (!productionTaskTypes.includes(task.type)) return;
      if (!task.dueDate) return;

      const dateKey = new Date(task.dueDate).toDateString();
      if (!counts[dateKey]) {
        counts[dateKey] = { pending: 0, completed: 0 };
      }

      if (task.status === 'COMPLETED') {
        counts[dateKey].completed++;
      } else {
        counts[dateKey].pending++;
      }
    });

    return counts;
  }, [tasks]);

  const handleOpenLog = (task: Task) => {
    setLoggingTask(task);
    const now = new Date();
    setLogForm({
      ...getDefaultFormData(),
      actualTrays: task.orderItem?.traysNeeded?.toString() || '',
      completedDate: now.toISOString().split('T')[0],
      completedTime: now.toTimeString().slice(0, 5),
    });
    setLogError(null);
  };

  const handleCloseLog = () => {
    setLoggingTask(null);
    setLogForm(getDefaultFormData());
    setLogError(null);
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);

    if (!loggingTask) return;

    if (!logForm.completedBy.trim()) {
      setLogError('Please enter your name');
      return;
    }

    // Combine date and time into ISO string
    const completedAt = new Date(`${logForm.completedDate}T${logForm.completedTime}`);

    try {
      await completeTask.mutateAsync({
        taskId: loggingTask.id,
        data: {
          completedBy: logForm.completedBy.trim(),
          completionNotes: logForm.completionNotes.trim() || undefined,
          actualTrays: logForm.actualTrays ? parseInt(logForm.actualTrays) : undefined,
          actualYieldOz: logForm.actualYieldOz ? parseFloat(logForm.actualYieldOz) : undefined,
          seedLot: logForm.seedLot.trim() || undefined,
          completedAt: completedAt.toISOString(),
        },
      });
      handleCloseLog();
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateLabel = (date: Date) => {
    const isToday = date.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.getTime() === tomorrow.getTime();

    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getTaskTypeInfo = (type: string) => {
    const info: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
      SOAK: {
        label: 'Soak Seeds',
        icon: '💧',
        color: 'text-blue-800 dark:text-blue-200',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
      },
      SEED: {
        label: 'Plant Seeds',
        icon: '🌱',
        color: 'text-green-800 dark:text-green-200',
        bgColor: 'bg-green-100 dark:bg-green-900',
      },
      MOVE_TO_LIGHT: {
        label: 'Move to Light',
        icon: '☀️',
        color: 'text-yellow-800 dark:text-yellow-200',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      },
      HARVESTING: {
        label: 'Harvest',
        icon: '✂️',
        color: 'text-purple-800 dark:text-purple-200',
        bgColor: 'bg-purple-100 dark:bg-purple-900',
      },
    };
    return info[type] || { label: type, icon: '📋', color: 'text-gray-800', bgColor: 'bg-gray-100' };
  };

  // Stats
  const todayPending = tasks?.filter((t) => {
    if (!t.dueDate || t.status === 'COMPLETED') return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime() && productionTaskTypes.includes(t.type);
  }).length ?? 0;

  const todayCompleted = tasks?.filter((t) => {
    if (!t.dueDate || t.status !== 'COMPLETED') return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime() && productionTaskTypes.includes(t.type);
  }).length ?? 0;

  const weekPending = tasks?.filter((t) => {
    if (!t.dueDate || t.status === 'COMPLETED') return false;
    if (!productionTaskTypes.includes(t.type)) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return due >= today && due <= weekEnd;
  }).length ?? 0;

  const renderTaskCard = (task: Task) => {
    const typeInfo = getTaskTypeInfo(task.type);
    const isCompleted = task.status === 'COMPLETED';

    return (
      <div
        key={task.id}
        onClick={() => !isCompleted && handleOpenLog(task)}
        className={`border rounded-lg p-4 bg-card transition-all ${
          isCompleted ? 'opacity-60' : 'hover:border-primary hover:shadow-md cursor-pointer'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Task Type Icon */}
          <div className={`text-3xl p-2 rounded-lg ${typeInfo.bgColor}`}>
            {typeInfo.icon}
          </div>

          {/* Task Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              {isCompleted && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Completed
                </span>
              )}
            </div>

            <h3 className={`font-semibold ${isCompleted ? 'line-through' : ''}`}>
              {task.orderItem?.product?.name || task.title}
            </h3>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {task.orderItem && (
                <>
                  {task.orderItem.order?.customer && (
                    <span>Customer: <strong>{task.orderItem.order.customer}</strong></span>
                  )}
                  <span>Order: <strong>{task.orderItem.order?.orderNumber}</strong></span>
                  <span>Trays: <strong>{task.orderItem.traysNeeded}</strong></span>
                  {task.type === 'HARVESTING' && (
                    <span>Target: <strong>{task.orderItem.quantityOz} oz</strong></span>
                  )}
                </>
              )}
            </div>

            {/* Completion log info */}
            {isCompleted && (
              <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {task.completedBy && <span>By: <strong>{task.completedBy}</strong></span>}
                  {task.completedAt && (
                    <span>At: <strong>{new Date(task.completedAt).toLocaleString()}</strong></span>
                  )}
                  {task.actualTrays && <span>Trays: <strong>{task.actualTrays}</strong></span>}
                  {task.seedLot && <span>Lot: <strong>{task.seedLot}</strong></span>}
                </div>
                {task.completionNotes && (
                  <p className="mt-1 italic">"{task.completionNotes}"</p>
                )}
              </div>
            )}
          </div>

          {/* Action indicator */}
          {!isCompleted && (
            <div className="text-muted-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-muted-foreground">
            {todayPending > 0 ? `${todayPending} tasks pending today` : 'All caught up for today!'}
            {todayCompleted > 0 && ` (${todayCompleted} completed)`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          Show completed
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Today Pending</p>
          <p className="text-2xl font-bold">{todayPending}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Today Completed</p>
          <p className="text-2xl font-bold">{todayCompleted}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold">{weekPending}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Pending</p>
          <p className="text-2xl font-bold">{filteredTasks.filter(t => t.status !== 'COMPLETED').length}</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b">
        {(['all', 'daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 -mb-px capitalize ${
              viewMode === mode ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Daily View Calendar Navigation */}
      {viewMode === 'daily' && (
        <div className="border rounded-lg bg-card p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {calendarDates.map((date) => {
              const dateKey = date.toDateString();
              const isSelected = date.getTime() === selectedDate.getTime();
              const isToday = date.getTime() === today.getTime();
              const counts = taskCountByDate[dateKey];
              const hasPending = counts?.pending > 0;
              const hasCompleted = counts?.completed > 0;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 w-20 p-3 rounded-lg text-center transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-xs font-medium opacity-70">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">{date.getDate()}</div>
                  <div className="flex justify-center gap-1 mt-1">
                    {hasPending && (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-orange-500'}`} />
                    )}
                    {hasCompleted && (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-primary-foreground/50' : 'bg-green-500'}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
      ) : sortedDateKeys.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-card">
          <div className="text-4xl mb-4">
            {viewMode === 'daily' && selectedDate.getTime() === today.getTime() ? '🎉' : '📅'}
          </div>
          <h3 className="text-lg font-semibold">No tasks found</h3>
          <p className="text-muted-foreground">
            {viewMode === 'daily'
              ? 'No tasks scheduled for this day.'
              : viewMode === 'weekly'
              ? 'No tasks scheduled for this week.'
              : viewMode === 'monthly'
              ? 'No tasks scheduled for this month.'
              : 'No pending tasks. Create orders to generate production tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header - always show for non-daily views, or show for daily if multiple dates somehow */}
              {viewMode !== 'daily' && (
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold">{formatDateHeader(dateKey)}</h3>
                  <span className="text-sm text-muted-foreground">
                    {tasksByDate[dateKey].filter(t => t.status !== 'COMPLETED').length} pending
                  </span>
                </div>
              )}

              {viewMode === 'daily' && (
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">{formatDateLabel(selectedDate)}</h2>
                  <span className="text-sm text-muted-foreground">
                    {tasksByDate[dateKey].filter(t => t.status !== 'COMPLETED').length} pending
                  </span>
                </div>
              )}

              {/* Tasks for this date */}
              <div className="space-y-3">
                {tasksByDate[dateKey].map(renderTaskCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Completion Log Modal */}
      {loggingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background">
              <div>
                <h2 className="text-lg font-semibold">Log Task Completion</h2>
                <p className="text-sm text-muted-foreground">
                  {getTaskTypeInfo(loggingTask.type).label}
                </p>
              </div>
              <button onClick={handleCloseLog} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitLog} className="p-6 space-y-4">
              {logError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {logError}
                </div>
              )}

              {/* Variety (read-only) */}
              <div>
                <label className="block text-sm font-medium mb-1">Variety</label>
                <input
                  type="text"
                  value={loggingTask.orderItem?.product?.name || loggingTask.title}
                  readOnly
                  className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
                />
              </div>

              {/* Order Info */}
              <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                {loggingTask.orderItem?.order?.customer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-medium">{loggingTask.orderItem.order.customer}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order:</span>
                  <span className="font-medium">{loggingTask.orderItem?.order?.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Trays:</span>
                  <span className="font-medium">{loggingTask.orderItem?.traysNeeded}</span>
                </div>
                {loggingTask.type === 'HARVESTING' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Yield:</span>
                    <span className="font-medium">{loggingTask.orderItem?.quantityOz} oz</span>
                  </div>
                )}
              </div>

              {/* Number of Trays */}
              <div>
                <label className="block text-sm font-medium mb-1">Number of Trays</label>
                <input
                  type="number"
                  min="1"
                  value={logForm.actualTrays}
                  onChange={(e) => setLogForm({ ...logForm, actualTrays: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder={loggingTask.orderItem?.traysNeeded?.toString() || ''}
                />
              </div>

              {/* Seed Lot */}
              <div>
                <label className="block text-sm font-medium mb-1">Seed Lot</label>
                <input
                  type="text"
                  value={logForm.seedLot}
                  onChange={(e) => setLogForm({ ...logForm, seedLot: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., LOT-2025-001 (optional)"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={logForm.completedDate}
                    onChange={(e) => setLogForm({ ...logForm, completedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={logForm.completedTime}
                    onChange={(e) => setLogForm({ ...logForm, completedTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>

              {/* Completed By */}
              <div>
                <label className="block text-sm font-medium mb-1">Your Name *</label>
                <input
                  type="text"
                  value={logForm.completedBy}
                  onChange={(e) => setLogForm({ ...logForm, completedBy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="Enter your name"
                />
              </div>

              {/* Actual Yield (for harvest only) */}
              {loggingTask.type === 'HARVESTING' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Actual Yield (oz)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={logForm.actualYieldOz}
                    onChange={(e) => setLogForm({ ...logForm, actualYieldOz: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder={loggingTask.orderItem?.quantityOz?.toString() || ''}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={logForm.completionNotes}
                  onChange={(e) => setLogForm({ ...logForm, completionNotes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                  rows={3}
                  placeholder="Any issues, observations, or notes... (optional)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseLog}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeTask.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {completeTask.isPending ? 'Saving...' : 'Mark Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
