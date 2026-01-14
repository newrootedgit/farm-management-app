import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFarmStore } from '@/stores/farm-store';
import { useTasks, useCompleteTask, useCreateRackAssignment, useUpdateTask, useUpdateOrder } from '@/lib/api-client';
import TaskCalendar from '@/components/operations/TaskCalendar';
import SeedingView from '@/components/operations/SeedingView';
import TransplantView from '@/components/operations/TransplantView';
import HarvestView from '@/components/operations/HarvestView';
import { RackSelector, type RackAllocation } from '@/components/operations/RackSelector';
import { SeedLotSelector, type SeedLotSelection } from '@/components/operations/SeedLotSelector';
import { LogViewerModal, type LogEditData } from '@/components/operations/LogViewerModal';
import { useToast } from '@/components/ui/Toast';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { Task } from '@farm/shared';

type ViewMode = 'all' | 'calendar' | 'seeding' | 'transplant' | 'harvest' | 'logs';

// Helper function to check if a task is overdue
// Tasks are overdue if:
// 1. They have a due date in the past AND
// 2. They are either not completed, OR completed but missing log data
const isOverdue = (task: Task): boolean => {
  if (!task.dueDate) return false;
  if (task.status === 'CANCELLED') return false;

  // Check if due date is in the past
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(23, 59, 59, 999); // End of due date
  const isPastDue = dueDate < new Date();

  if (!isPastDue) return false;

  // If not completed, it's overdue
  if (task.status !== 'COMPLETED') return true;

  // If completed but missing log data, it's still overdue
  // (wasn't properly completed)
  if (!task.completedBy) return true;

  return false;
};

// Helper function to get the past tense action label for a task type
const getTaskActionLabel = (type: string): string => {
  switch (type) {
    case 'SOAK': return 'Soaked';
    case 'SEED': return 'Seeded';
    case 'MOVE_TO_LIGHT': return 'Transplanted';
    case 'HARVESTING': return 'Harvested';
    default: return 'Completed';
  }
};

interface TaskLogFormData {
  completedBy: string;
  actualTrays: string;
  actualYieldOz: string;
  seedLot: string;
  seedLotSelection: SeedLotSelection | null;
  completedDate: string;
  completedTime: string;
  completionNotes: string;
  // For MOVE_TO_LIGHT tasks
  rackDestination: RackAllocation | null;
}

const getDefaultFormData = (): TaskLogFormData => {
  const now = new Date();
  return {
    completedBy: '',
    actualTrays: '',
    actualYieldOz: '',
    seedLot: '',
    seedLotSelection: null,
    completedDate: now.toISOString().split('T')[0],
    completedTime: now.toTimeString().slice(0, 5),
    completionNotes: '',
    rackDestination: null,
  };
};

export default function OperationsPage() {
  const { currentFarmId } = useFarmStore();
  const { data: tasks, isLoading } = useTasks(currentFarmId ?? undefined);
  const completeTask = useCompleteTask(currentFarmId ?? '');
  const createRackAssignment = useCreateRackAssignment(currentFarmId ?? '');
  const updateTask = useUpdateTask(currentFarmId ?? '');
  const updateOrder = useUpdateOrder(currentFarmId ?? '');
  const { showToast } = useToast();
  const logModalRef = useRef<HTMLDivElement>(null);

  // View mode - support URL param ?tab=seeding for deep linking from tutorial
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ViewMode | null;
  const validTabs: ViewMode[] = ['all', 'calendar', 'seeding', 'transplant', 'harvest', 'logs'];
  const [viewMode, setViewMode] = useState<ViewMode>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'calendar'
  );

  // Sync view mode when URL param changes (for same-page navigation)
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setViewMode(tabParam);
    }
  }, [tabParam]);

  const [loggingTask, setLoggingTask] = useState<Task | null>(null);
  const [logForm, setLogForm] = useState<TaskLogFormData>(getDefaultFormData());
  const [logError, setLogError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  const [viewingLog, setViewingLog] = useState<Task | null>(null);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  // Escape key to close modals
  useEscapeKey(!!loggingTask, () => {
    setLoggingTask(null);
    setLogForm(getDefaultFormData());
    setLogError(null);
  });
  useEscapeKey(!!viewingLog, () => setViewingLog(null));
  useEscapeKey(showOverdueModal, () => setShowOverdueModal(false));

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
        // "Show completed" only hides tasks that are FULLY completed (have log data)
        // Overdue tasks should always be visible unless "Show overdue" is unchecked
        const isFullyCompleted = task.status === 'COMPLETED' && task.completedBy;
        if (!showCompleted && isFullyCompleted) return false;
        if (!showOverdue && isOverdue(task)) return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, showCompleted, showOverdue]);


  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    filteredTasks.forEach((task) => {
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
  }, [filteredTasks]);

  // Get sorted date keys
  const sortedDateKeys = useMemo(() => {
    return Object.keys(tasksByDate).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [tasksByDate]);


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
      // Scroll to top of modal to show error
      logModalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Combine date and time into ISO string
    const completedAt = new Date(`${logForm.completedDate}T${logForm.completedTime}`);
    const productName = loggingTask.orderItem?.product?.name || 'Task';

    // Calculate if task is late and generate auto-note
    let finalNotes = logForm.completionNotes.trim();

    if (loggingTask.dueDate) {
      const dueDate = new Date(loggingTask.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const completedDate = new Date(logForm.completedDate);
      completedDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        // Task type friendly names
        const typeNames: Record<string, string> = {
          SOAK: 'Soaking',
          SEED: 'Seeding',
          MOVE_TO_LIGHT: 'Move to light',
          HARVESTING: 'Harvest',
        };
        const typeName = typeNames[loggingTask.type] || loggingTask.type;
        const dayWord = diffDays === 1 ? 'day' : 'days';
        const lateNote = `⚠️ ${typeName} ${diffDays} ${dayWord} late.`;

        // Prepend to user notes
        finalNotes = finalNotes ? `${lateNote}\n${finalNotes}` : lateNote;
      }
    }

    try {
      // Build seed usage data if using inventory-tracked seed lot
      let seedUsage: {
        supplyId: string;
        lotNumber: string;
        quantity: number;
        isNewLot?: boolean;
        newLotData?: {
          quantity: number;
          unit: string;
          supplier: string;
          expiryDate?: string;
        };
      } | undefined;

      if (logForm.seedLotSelection?.supplyId && logForm.seedLotSelection.lotNumber) {
        const seedWeight = (loggingTask.orderItem?.product as { seedWeight?: number })?.seedWeight;
        const trays = logForm.actualTrays ? parseInt(logForm.actualTrays) : (loggingTask.orderItem?.traysNeeded ?? 0);
        const usageQuantity = seedWeight && trays > 0 ? trays * seedWeight : 0;

        seedUsage = {
          supplyId: logForm.seedLotSelection.supplyId,
          lotNumber: logForm.seedLotSelection.lotNumber,
          quantity: usageQuantity,
          isNewLot: logForm.seedLotSelection.isNewLot,
          newLotData: logForm.seedLotSelection.newLotData,
        };
      }

      // Complete the task
      await completeTask.mutateAsync({
        taskId: loggingTask.id,
        data: {
          completedBy: logForm.completedBy.trim(),
          completionNotes: finalNotes || undefined,
          actualTrays: logForm.actualTrays ? parseInt(logForm.actualTrays) : undefined,
          actualYieldOz: logForm.actualYieldOz ? parseFloat(logForm.actualYieldOz) : undefined,
          seedLot: logForm.seedLot.trim() || undefined,
          completedAt: completedAt.toISOString(),
          seedUsage,
        },
      });

      // For MOVE_TO_LIGHT tasks, create rack assignments for each level allocation
      if (
        loggingTask.type === 'MOVE_TO_LIGHT' &&
        logForm.rackDestination?.rackElementId &&
        logForm.rackDestination?.levelAllocations.length > 0 &&
        loggingTask.orderItem
      ) {
        // Create an assignment for each level allocation
        for (const allocation of logForm.rackDestination.levelAllocations) {
          await createRackAssignment.mutateAsync({
            rackElementId: logForm.rackDestination.rackElementId,
            level: allocation.level,
            orderItemId: loggingTask.orderItem.id,
            trayCount: allocation.trayCount,
            taskId: loggingTask.id,
            assignedBy: logForm.completedBy.trim(),
          });
        }
      }

      // Show success message and close modal
      showToast('success', `${productName} log completed successfully`);
      handleCloseLog();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      setLogError(errorMessage);
      // Scroll to top of modal to show error
      logModalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Stats - a task is only "completed" if it has log data (completedBy filled in)
  const todayPending = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    // Task is pending if it doesn't have log data
    const isFullyComplete = t.status === 'COMPLETED' && t.completedBy;
    if (isFullyComplete) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime() && productionTaskTypes.includes(t.type);
  }).length ?? 0;

  const todayCompleted = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    // Task is only completed if it has log data
    const isFullyComplete = t.status === 'COMPLETED' && t.completedBy;
    if (!isFullyComplete) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime() && productionTaskTypes.includes(t.type);
  }).length ?? 0;

  const weekPending = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    if (!productionTaskTypes.includes(t.type)) return false;
    // Task is pending if it doesn't have log data
    const isFullyComplete = t.status === 'COMPLETED' && t.completedBy;
    if (isFullyComplete) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return due >= today && due <= weekEnd;
  }).length ?? 0;

  const overdueCount = tasks?.filter((t) => {
    if (!productionTaskTypes.includes(t.type)) return false;
    return isOverdue(t);
  }).length ?? 0;

  // Completed tasks for logs view (grouped by completion date)
  // Only include tasks that have proper log data (completedBy filled in)
  const completedTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.status === 'COMPLETED' && productionTaskTypes.includes(t.type) && t.completedBy)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
  }, [tasks]);

  // Tasks that are marked COMPLETED but missing log data
  const tasksMissingLog = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.status === 'COMPLETED' && productionTaskTypes.includes(t.type) && !t.completedBy)
      .sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateA - dateB; // Oldest first
      });
  }, [tasks]);

  // Overdue tasks list
  const overdueTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => productionTaskTypes.includes(t.type) && isOverdue(t))
      .sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateA - dateB; // Oldest first (most overdue)
      });
  }, [tasks]);

  const completedByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    completedTasks.forEach((task) => {
      const dateKey = task.completedAt
        ? new Date(task.completedAt).toDateString()
        : 'Unknown';
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [completedTasks]);

  // Handle saving edits to a log
  const handleSaveLogEdit = useCallback(async (taskId: string, data: LogEditData) => {
    // Get the task being edited
    const task = viewingLog;

    await updateTask.mutateAsync({
      taskId,
      data: {
        completedBy: data.completedBy,
        completionNotes: data.completionNotes,
        actualTrays: data.actualTrays,
        seedLot: data.seedLot,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      },
    });

    // If completion date differs from due date, add a note to the order
    if (task && data.completedAt && task.dueDate && task.orderItem?.order?.id) {
      const completedDate = new Date(data.completedAt);
      completedDate.setHours(0, 0, 0, 0);

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.round((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff !== 0) {
        const actionLabel = getTaskActionLabel(task.type);
        const productName = task.orderItem?.product?.name || 'Product';
        const timingNote = daysDiff > 0
          ? `${daysDiff} day${daysDiff > 1 ? 's' : ''} late`
          : `${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''} early`;

        const newNote = `${productName}: ${actionLabel} ${timingNote}`;
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const formattedNote = `[${dateStr}] ${newNote}`;

        try {
          // Fetch the order to get existing notes
          const orderRes = await fetch(`/api/v1/farms/${currentFarmId}/orders/${task.orderItem.order.id}`);
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const existingNotes = orderData.notes || '';
            const updatedNotes = existingNotes
              ? `${existingNotes}\n${formattedNote}`
              : formattedNote;

            // Update the order with appended note
            await updateOrder.mutateAsync({
              orderId: task.orderItem.order.id,
              data: { notes: updatedNotes },
            });
          }
        } catch (err) {
          // Don't fail the whole operation if note update fails
          console.error('Failed to add timing note to order:', err);
        }
      }
    }

    // Close the modal and refresh
    setViewingLog(null);
  }, [updateTask, updateOrder, viewingLog]);

  const renderTaskCard = (task: Task) => {
    const typeInfo = getTaskTypeInfo(task.type);
    const isCompleted = task.status === 'COMPLETED';
    const taskIsOverdue = isOverdue(task);
    // A task is fully complete only if status is COMPLETED and has log data
    const isFullyComplete = isCompleted && task.completedBy;

    return (
      <div
        key={task.id}
        onClick={() => {
          if (isFullyComplete) {
            setViewingLog(task);
          } else {
            handleOpenLog(task);
          }
        }}
        className={`border rounded-lg p-4 bg-card transition-all cursor-pointer ${
          taskIsOverdue
            ? 'border-red-400 bg-red-50 dark:bg-red-950/30 hover:border-red-500 hover:shadow-md'
            : isFullyComplete
            ? 'opacity-70 hover:opacity-100 hover:border-blue-300 hover:shadow-md'
            : 'hover:border-primary hover:shadow-md'
        }`}
        data-tutorial="task-card"
      >
        <div className="flex items-start gap-4">
          {/* Task Type Icon */}
          <div className={`text-3xl p-2 rounded-lg ${typeInfo.bgColor}`}>
            {typeInfo.icon}
          </div>

          {/* Task Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              {taskIsOverdue && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  ⚠️ OVERDUE
                </span>
              )}
              {isFullyComplete && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Completed
                </span>
              )}
            </div>

            <h3 className={`font-semibold ${isFullyComplete ? 'line-through' : ''}`}>
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
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOverdue}
              onChange={(e) => setShowOverdue(e.target.checked)}
              className="rounded"
            />
            Show overdue
          </label>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {overdueCount > 0 && (
          <button
            onClick={() => setShowOverdueModal(true)}
            className="border border-red-300 rounded-lg p-4 bg-red-50 dark:bg-red-950/30 text-left hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
          >
            <p className="text-sm text-red-700 dark:text-red-300">Overdue</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">⚠️ {overdueCount}</p>
          </button>
        )}
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
          <p className="text-2xl font-bold">{filteredTasks.filter(t => !(t.status === 'COMPLETED' && t.completedBy)).length}</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {(['calendar', 'seeding', 'transplant', 'harvest', 'logs', 'all'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 -mb-px capitalize whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === mode ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <TaskCalendar
          tasks={tasks || []}
          onTaskClick={(task) => {
            // Only block if task is FULLY complete (has log data)
            const isFullyComplete = task.status === 'COMPLETED' && task.completedBy;
            if (!isFullyComplete) {
              handleOpenLog(task);
            }
          }}
          onViewLog={(task) => setViewingLog(task)}
          showCompleted={showCompleted}
          showOverdue={showOverdue}
        />
      )}

      {/* Seeding View */}
      {viewMode === 'seeding' && (
        <SeedingView
          tasks={tasks || []}
          onTaskClick={(task) => {
            // Only block if task is FULLY complete (has log data)
            const isFullyComplete = task.status === 'COMPLETED' && task.completedBy;
            if (!isFullyComplete) {
              handleOpenLog(task);
            }
          }}
          onViewLog={(task) => setViewingLog(task)}
          showCompleted={showCompleted}
          showOverdue={showOverdue}
        />
      )}

      {/* Transplant View */}
      {viewMode === 'transplant' && (
        <TransplantView
          tasks={tasks || []}
          onTaskClick={(task) => {
            // Only block if task is FULLY complete (has log data)
            const isFullyComplete = task.status === 'COMPLETED' && task.completedBy;
            if (!isFullyComplete) {
              handleOpenLog(task);
            }
          }}
          onViewLog={(task) => setViewingLog(task)}
          showCompleted={showCompleted}
          showOverdue={showOverdue}
        />
      )}

      {/* Harvest View */}
      {viewMode === 'harvest' && (
        <HarvestView
          tasks={tasks || []}
          onTaskClick={(task) => {
            // Only block if task is FULLY complete (has log data)
            const isFullyComplete = task.status === 'COMPLETED' && task.completedBy;
            if (!isFullyComplete) {
              handleOpenLog(task);
            }
          }}
          onViewLog={(task) => setViewingLog(task)}
          showCompleted={showCompleted}
          showOverdue={showOverdue}
        />
      )}

      {/* Logs View */}
      {viewMode === 'logs' && (
        isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading logs...</div>
        ) : completedTasks.length === 0 && tasksMissingLog.length === 0 ? (
          <div className="border rounded-lg p-12 text-center bg-card">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold">No logs yet</h3>
            <p className="text-muted-foreground">
              Completed tasks will appear here as logs.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tasks Missing Logs */}
            {tasksMissingLog.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">📝 Tasks Missing Logs</h2>
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    {tasksMissingLog.length} need attention
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These tasks were marked complete but don't have log data. Click to add log information.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksMissingLog.map((task) => {
                    const typeInfo = getTaskTypeInfo(task.type);
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleOpenLog(task)}
                        className="border-2 border-amber-400 rounded-lg p-4 bg-amber-50 dark:bg-amber-950/30 hover:border-amber-500 hover:shadow-md cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`text-2xl p-2 rounded-lg ${typeInfo.bgColor}`}>
                            {typeInfo.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Missing Log
                              </span>
                            </div>
                            <h4 className="font-semibold">
                              {task.orderItem?.product?.name || task.title}
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                              {task.orderItem?.order?.customer && (
                                <span>Customer: <strong>{task.orderItem.order.customer}</strong></span>
                              )}
                              {task.dueDate && (
                                <span>Due: <strong>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong></span>
                              )}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Logs */}
            {completedTasks.length > 0 && (
              <>
                {Object.keys(completedByDate)
                  .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                  .map((dateKey) => {
                    const tasksWithLogs = completedByDate[dateKey];
                    if (tasksWithLogs.length === 0) return null;

                    const formattedDate = dateKey === 'Unknown' ? 'Unknown' : (() => {
                      const date = new Date(dateKey);
                      const isToday = date.toDateString() === today.toDateString();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = date.toDateString() === yesterday.toDateString();
                      if (isToday) return 'Today';
                      if (isYesterday) return 'Yesterday';
                      return date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      });
                    })();

                    return (
                      <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{formattedDate}</h3>
                          <span className="text-sm text-muted-foreground">
                            {tasksWithLogs.length} completed
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tasksWithLogs.map((task) => {
                            const typeInfo = getTaskTypeInfo(task.type);
                            return (
                              <div
                                key={task.id}
                                onClick={() => setViewingLog(task)}
                                className="border rounded-lg p-4 bg-card hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                              >
                                <div className="flex items-start gap-4">
                                  <div className={`text-2xl p-2 rounded-lg ${typeInfo.bgColor}`}>
                                    {typeInfo.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                                        {typeInfo.label}
                                      </span>
                                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        ✓ Completed
                                      </span>
                                    </div>
                                    <h4 className="font-semibold">
                                      {task.orderItem?.product?.name || task.title}
                                    </h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                      {task.orderItem?.order?.customer && (
                                        <span>Customer: <strong>{task.orderItem.order.customer}</strong></span>
                                      )}
                                      {task.completedBy && (
                                        <span>By: <strong>{task.completedBy}</strong></span>
                                      )}
                                      {task.completedAt && (
                                        <span>At: <strong>{new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                                      )}
                                      {task.actualTrays && (
                                        <span>Trays: <strong>{task.actualTrays}</strong></span>
                                      )}
                                    </div>
                                    {task.completionNotes && (
                                      <p className="mt-2 text-sm text-muted-foreground italic truncate">
                                        "{task.completionNotes}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )
      )}

      {/* Tasks List - All Tasks View */}
      {viewMode === 'all' && (
        isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
        ) : sortedDateKeys.length === 0 ? (
          <div className="border rounded-lg p-12 text-center bg-card">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold">No tasks found</h3>
            <p className="text-muted-foreground">
              No pending tasks. Create orders to generate production tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDateKeys.map((dateKey) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold">{formatDateHeader(dateKey)}</h3>
                  <span className="text-sm text-muted-foreground">
                    {tasksByDate[dateKey].filter(t => !(t.status === 'COMPLETED' && t.completedBy)).length} pending
                  </span>
                </div>

                {/* Tasks for this date */}
                <div className="space-y-3">
                  {tasksByDate[dateKey].map(renderTaskCard)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Task Completion Log Modal */}
      {loggingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div ref={logModalRef} className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
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
                {loggingTask.type === 'SEED' && (loggingTask.orderItem?.product as { seedWeight?: number; seedUnit?: string })?.seedWeight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seed Weight per Tray:</span>
                    <span className="font-medium">
                      {(loggingTask.orderItem?.product as { seedWeight?: number; seedUnit?: string })?.seedWeight}{' '}
                      {(loggingTask.orderItem?.product as { seedWeight?: number; seedUnit?: string })?.seedUnit || 'g'}
                    </span>
                  </div>
                )}
                {loggingTask.type === 'SEED' && (loggingTask.orderItem?.product as { seedWeight?: number })?.seedWeight && loggingTask.orderItem?.traysNeeded && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Seed Needed:</span>
                    <span className="font-medium">
                      {((loggingTask.orderItem?.product as { seedWeight?: number })?.seedWeight || 0) * (loggingTask.orderItem?.traysNeeded || 0)}{' '}
                      {(loggingTask.orderItem?.product as { seedUnit?: string })?.seedUnit || 'g'}
                    </span>
                  </div>
                )}
                {(loggingTask.type === 'SEED' || loggingTask.type === 'MOVE_TO_LIGHT' || loggingTask.type === 'HARVESTING') && loggingTask.orderItem?.seedLot && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seed Lot:</span>
                    <span className="font-medium">{loggingTask.orderItem.seedLot}</span>
                  </div>
                )}
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

              {/* Seed Lot - Show for SOAK or SEED tasks if not already set */}
              {(loggingTask.type === 'SOAK' || loggingTask.type === 'SEED') && !loggingTask.orderItem?.seedLot && currentFarmId && (
                <SeedLotSelector
                  farmId={currentFarmId}
                  productId={loggingTask.orderItem?.product?.id}
                  productName={loggingTask.orderItem?.product?.name || 'Unknown'}
                  seedWeight={(loggingTask.orderItem?.product as { seedWeight?: number })?.seedWeight || null}
                  seedUnit={(loggingTask.orderItem?.product as { seedUnit?: string })?.seedUnit || null}
                  traysNeeded={logForm.actualTrays ? parseInt(logForm.actualTrays) : (loggingTask.orderItem?.traysNeeded ?? 0)}
                  value={logForm.seedLotSelection}
                  onChange={(val) => setLogForm({
                    ...logForm,
                    seedLotSelection: val,
                    seedLot: val?.lotNumber ?? '',
                  })}
                />
              )}

              {/* Rack Destination (for MOVE_TO_LIGHT tasks) - Optional */}
              {loggingTask.type === 'MOVE_TO_LIGHT' && currentFarmId && (
                <div className="p-3 border rounded-md bg-muted/30">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span>☀️</span>
                    Destination Rack
                    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Track where these trays are placed. You can add or edit this later from the Farm Layout.
                  </p>
                  <RackSelector
                    farmId={currentFarmId}
                    value={logForm.rackDestination}
                    onChange={(value) => setLogForm({ ...logForm, rackDestination: value })}
                    trayCount={logForm.actualTrays ? parseInt(logForm.actualTrays) : (loggingTask.orderItem?.traysNeeded ?? 0)}
                  />
                </div>
              )}

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

              {/* Actual Yield (for harvest only) - Required */}
              {loggingTask.type === 'HARVESTING' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Actual Yield (oz) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={logForm.actualYieldOz}
                    onChange={(e) => setLogForm({ ...logForm, actualYieldOz: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
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

      {/* Log Viewer Modal */}
      {viewingLog && (
        <LogViewerModal
          task={viewingLog}
          onClose={() => setViewingLog(null)}
          onSaveEdit={handleSaveLogEdit}
        />
      )}

      {/* Overdue Tasks Modal */}
      {showOverdueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background">
              <div>
                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Overdue Tasks</h2>
                <p className="text-sm text-muted-foreground">
                  {overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''} overdue
                </p>
              </div>
              <button
                onClick={() => setShowOverdueModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {overdueTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No overdue tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueTasks.map((task) => {
                    const typeInfo = getTaskTypeInfo(task.type);
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    const daysOverdue = dueDate
                      ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          setShowOverdueModal(false);
                          handleOpenLog(task);
                        }}
                        className="w-full text-left border-2 border-red-300 rounded-lg p-4 bg-red-50 dark:bg-red-950/30 hover:border-red-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`text-2xl p-2 rounded-lg ${typeInfo.bgColor}`}>
                            {typeInfo.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                              </span>
                            </div>
                            <h4 className="font-semibold">
                              {task.orderItem?.product?.name || task.title}
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                              {task.orderItem?.order?.customer && (
                                <span>Customer: <strong>{task.orderItem.order.customer}</strong></span>
                              )}
                              {task.orderItem?.order?.orderNumber && (
                                <span>Order: <strong>{task.orderItem.order.orderNumber}</strong></span>
                              )}
                              {task.orderItem?.traysNeeded && (
                                <span>Trays: <strong>{task.orderItem.traysNeeded}</strong></span>
                              )}
                              {dueDate && (
                                <span>Due: <strong>{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong></span>
                              )}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t px-6 py-3 bg-muted/30">
              <button
                onClick={() => setShowOverdueModal(false)}
                className="w-full px-4 py-2 border rounded-md hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
