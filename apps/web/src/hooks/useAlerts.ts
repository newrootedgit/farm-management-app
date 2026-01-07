import { useMemo, useEffect } from 'react';
import { useTasks, useSupplies } from '@/lib/api-client';
import { useAlertStore } from '@/stores/alert-store';

export interface Alert {
  id: string;
  type: 'overdue' | 'due_today' | 'low_stock';
  priority: 1 | 2 | 3; // 1 = critical, 2 = warning, 3 = info
  title: string;
  message: string;
  entityId: string;
  entityType: 'task' | 'supply';
  actionUrl: string;
  actionLabel: string;
  createdAt: Date;
  autoDismiss: boolean;
  // Extra context for display
  meta?: {
    customer?: string;
    orderNumber?: string;
    taskType?: string;
    unit?: string;
    currentStock?: number;
  };
}

// Format relative date (e.g., "3 days ago", "Yesterday")
function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

// Get task type display label
function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SOAK: 'Soak',
    SEED: 'Seed',
    MOVE_TO_LIGHT: 'Move to Light',
    HARVESTING: 'Harvest',
  };
  return labels[type] || type;
}

export function useAlerts(farmId: string | undefined) {
  const { data: tasks, isLoading: tasksLoading } = useTasks(farmId);
  const { data: supplies, isLoading: suppliesLoading } = useSupplies(farmId ?? null);
  const { dismissedAlertIds, removeDismissed, lastSeenTimestamp } = useAlertStore();

  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Overdue Tasks (CRITICAL - priority 1)
    tasks
      ?.filter((t) => {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      })
      .forEach((task) => {
        result.push({
          id: `overdue-${task.id}`,
          type: 'overdue',
          priority: 1,
          title: task.orderItem?.product?.name || task.title || 'Task',
          message: `${getTaskTypeLabel(task.type)} due ${formatRelativeDate(task.dueDate!)}`,
          entityId: task.id,
          entityType: 'task',
          actionUrl: '/operations',
          actionLabel: 'View Task',
          createdAt: new Date(task.dueDate!),
          autoDismiss: true,
          meta: {
            customer: task.orderItem?.order?.customer ?? undefined,
            orderNumber: task.orderItem?.order?.orderNumber,
            taskType: task.type,
          },
        });
      });

    // 2. Due Today Tasks (WARNING - priority 2)
    tasks
      ?.filter((t) => {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      })
      .forEach((task) => {
        result.push({
          id: `due_today-${task.id}`,
          type: 'due_today',
          priority: 2,
          title: task.orderItem?.product?.name || task.title || 'Task',
          message: `${getTaskTypeLabel(task.type)} due today`,
          entityId: task.id,
          entityType: 'task',
          actionUrl: '/operations',
          actionLabel: 'View Task',
          createdAt: new Date(task.dueDate!),
          autoDismiss: true,
          meta: {
            customer: task.orderItem?.order?.customer ?? undefined,
            orderNumber: task.orderItem?.order?.orderNumber,
            taskType: task.type,
          },
        });
      });

    // 3. Low Stock Supplies (WARNING - priority 2)
    supplies
      ?.filter((s) => {
        const stock = s.currentStock ?? 0;
        return stock <= 0;
      })
      .forEach((supply) => {
        result.push({
          id: `low_stock-${supply.id}`,
          type: 'low_stock',
          priority: 2,
          title: supply.name,
          message: `Out of stock`,
          entityId: supply.id,
          entityType: 'supply',
          actionUrl: '/supplies',
          actionLabel: 'Restock',
          createdAt: new Date(),
          autoDismiss: true,
          meta: {
            unit: supply.unit ?? 'units',
            currentStock: supply.currentStock ?? 0,
          },
        });
      });

    // Filter out dismissed alerts and sort by priority, then by date
    return result
      .filter((a) => !dismissedAlertIds.includes(a.id))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [tasks, supplies, dismissedAlertIds]);

  // Clean up stale dismissed IDs (for alerts that no longer exist)
  useEffect(() => {
    const currentAlertIds = new Set([
      ...(tasks?.map((t) => `overdue-${t.id}`) || []),
      ...(tasks?.map((t) => `due_today-${t.id}`) || []),
      ...(supplies?.map((s) => `low_stock-${s.id}`) || []),
    ]);

    const staleIds = dismissedAlertIds.filter((id) => !currentAlertIds.has(id));
    if (staleIds.length > 0) {
      removeDismissed(staleIds);
    }
  }, [tasks, supplies, dismissedAlertIds, removeDismissed]);

  // Computed counts
  const criticalCount = alerts.filter((a) => a.priority === 1).length;
  const warningCount = alerts.filter((a) => a.priority === 2).length;
  const infoCount = alerts.filter((a) => a.priority === 3).length;
  const totalCount = alerts.length;

  // Count alerts created after last seen timestamp (for "new" badge)
  const unreadCount = alerts.filter(
    (a) => a.createdAt.getTime() > lastSeenTimestamp
  ).length;

  return {
    alerts,
    criticalCount,
    warningCount,
    infoCount,
    totalCount,
    unreadCount,
    isLoading: tasksLoading || suppliesLoading,
  };
}

// Hook for just overdue and due today tasks (used by Dashboard Priority Panel)
export function usePriorityTasks(farmId: string | undefined) {
  const { data: tasks, isLoading } = useTasks(farmId);

  return useMemo(() => {
    if (!tasks) return { overdueTasks: [], dueTodayTasks: [], isLoading };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    const dueTodayTasks = tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });

    return { overdueTasks, dueTodayTasks, isLoading };
  }, [tasks, isLoading]);
}
