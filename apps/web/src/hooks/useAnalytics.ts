import { useMemo } from 'react';
import type { Task, Customer, OrderWithItems } from '@farm/shared';

export interface AnalyticsData {
  // Revenue metrics
  revenueByMonth: { month: string; label: string; totalOz: number; orderCount: number }[];
  totalOzThisMonth: number;
  totalOzLastMonth: number;
  monthOverMonthChange: number;

  // Order metrics
  ordersByStatus: { status: string; count: number; percentage: number }[];
  totalOrders: number;
  avgItemsPerOrder: number;

  // Customer metrics
  topCustomers: { name: string; totalOz: number; orderCount: number }[];
  totalCustomers: number;
  activeCustomers: number; // Customers with orders in last 30 days

  // Task metrics
  taskCompletionRate: number;
  tasksByType: { type: string; label: string; pending: number; completed: number }[];
  overdueTaskCount: number;

  // Yield metrics
  yieldVariance: { product: string; expected: number; actual: number; variance: number }[];
  avgYieldAccuracy: number;
}

interface UseAnalyticsOptions {
  orders?: OrderWithItems[];
  tasks?: Task[];
  customers?: Customer[];
  dateRange?: { from: Date; to: Date };
}

// Task type labels
const TASK_TYPE_LABELS: Record<string, string> = {
  SOAK: 'Soak',
  SEED: 'Seed',
  MOVE_TO_LIGHT: 'Light',
  HARVESTING: 'Harvest',
};

export function useAnalytics({
  orders = [],
  tasks = [],
  customers = [],
  dateRange,
}: UseAnalyticsOptions): AnalyticsData {
  return useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter by date range if provided
    const filteredOrders = dateRange
      ? orders.filter((o) => {
          const date = new Date(o.createdAt);
          return date >= dateRange.from && date <= dateRange.to;
        })
      : orders;

    const filteredTasks = dateRange
      ? tasks.filter((t) => {
          if (!t.dueDate) return false;
          const date = new Date(t.dueDate);
          return date >= dateRange.from && date <= dateRange.to;
        })
      : tasks;

    // ==================== Revenue by Month ====================
    const monthlyData: Map<string, { totalOz: number; orderCount: number }> = new Map();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { totalOz: 0, orderCount: 0 });
    }

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyData.get(key);
      if (existing) {
        const orderOz = order.items?.reduce((sum: number, item) => sum + (item.quantityOz || 0), 0) || 0;
        existing.totalOz += orderOz;
        existing.orderCount += 1;
      }
    });

    const revenueByMonth = Array.from(monthlyData.entries()).map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month, label, ...data };
    });

    // This month vs last month
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthKey = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}`;

    const totalOzThisMonth = monthlyData.get(thisMonthKey)?.totalOz || 0;
    const totalOzLastMonth = monthlyData.get(lastMonthKey)?.totalOz || 0;
    const monthOverMonthChange = totalOzLastMonth > 0
      ? ((totalOzThisMonth - totalOzLastMonth) / totalOzLastMonth) * 100
      : totalOzThisMonth > 0 ? 100 : 0;

    // ==================== Orders by Status ====================
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    const totalOrders = filteredOrders.length;
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
    }));

    const avgItemsPerOrder = totalOrders > 0
      ? filteredOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0) / totalOrders
      : 0;

    // ==================== Top Customers ====================
    const customerStats: Map<string, { name: string; totalOz: number; orderCount: number }> = new Map();

    filteredOrders.forEach((order) => {
      const customerName = order.customer || 'Walk-in';
      const customerKey = customerName.toLowerCase();

      const existing = customerStats.get(customerKey);
      const orderOz = order.items?.reduce((sum: number, item) => sum + (item.quantityOz || 0), 0) || 0;

      if (existing) {
        existing.totalOz += orderOz;
        existing.orderCount += 1;
      } else {
        customerStats.set(customerKey, {
          name: customerName,
          totalOz: orderOz,
          orderCount: 1,
        });
      }
    });

    const topCustomers = Array.from(customerStats.values())
      .sort((a, b) => b.totalOz - a.totalOz)
      .slice(0, 10);

    // Active customers (orders in last 30 days)
    const activeCustomerNames = new Set(
      orders
        .filter((o) => new Date(o.createdAt) >= thirtyDaysAgo && o.customer)
        .map((o) => o.customer?.toLowerCase())
    );

    // ==================== Task Metrics ====================
    const productionTaskTypes = ['SOAK', 'SEED', 'MOVE_TO_LIGHT', 'HARVESTING'];
    const productionTasks = filteredTasks.filter((t) => productionTaskTypes.includes(t.type));

    const completedTasks = productionTasks.filter((t) => t.status === 'COMPLETED');
    const taskCompletionRate = productionTasks.length > 0
      ? (completedTasks.length / productionTasks.length) * 100
      : 0;

    const taskTypeStats: Map<string, { pending: number; completed: number }> = new Map();
    productionTaskTypes.forEach((type) => {
      taskTypeStats.set(type, { pending: 0, completed: 0 });
    });

    productionTasks.forEach((task) => {
      const stats = taskTypeStats.get(task.type);
      if (stats) {
        if (task.status === 'COMPLETED') {
          stats.completed += 1;
        } else {
          stats.pending += 1;
        }
      }
    });

    const tasksByType = Array.from(taskTypeStats.entries()).map(([type, stats]) => ({
      type,
      label: TASK_TYPE_LABELS[type] || type,
      ...stats,
    }));

    // Overdue tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTaskCount = productionTasks.filter((t) => {
      if (t.status === 'COMPLETED' || !t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    // ==================== Yield Metrics ====================
    const productYields: Map<string, { expected: number; actual: number }> = new Map();

    completedTasks
      .filter((t) => t.type === 'HARVESTING' && t.orderItem)
      .forEach((task) => {
        const productName = task.orderItem?.product?.name || 'Unknown';
        const expected = task.orderItem?.quantityOz || 0;
        // actualYieldOz may not be in the type definition but could exist at runtime
        const orderItemAny = task.orderItem as { actualYieldOz?: number } | null;
        const actual = orderItemAny?.actualYieldOz || 0;

        const existing = productYields.get(productName);
        if (existing) {
          existing.expected += expected;
          existing.actual += actual;
        } else {
          productYields.set(productName, { expected, actual });
        }
      });

    const yieldVariance = Array.from(productYields.entries())
      .map(([product, data]) => ({
        product,
        expected: data.expected,
        actual: data.actual,
        variance: data.expected > 0 ? ((data.actual - data.expected) / data.expected) * 100 : 0,
      }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    const totalExpected = Array.from(productYields.values()).reduce((sum, d) => sum + d.expected, 0);
    const totalActual = Array.from(productYields.values()).reduce((sum, d) => sum + d.actual, 0);
    const avgYieldAccuracy = totalExpected > 0
      ? Math.max(0, 100 - Math.abs(((totalActual - totalExpected) / totalExpected) * 100))
      : 100;

    return {
      revenueByMonth,
      totalOzThisMonth,
      totalOzLastMonth,
      monthOverMonthChange,
      ordersByStatus,
      totalOrders,
      avgItemsPerOrder,
      topCustomers,
      totalCustomers: customers.length,
      activeCustomers: activeCustomerNames.size,
      taskCompletionRate,
      tasksByType,
      overdueTaskCount,
      yieldVariance,
      avgYieldAccuracy,
    };
  }, [orders, tasks, customers, dateRange]);
}

// Helper for formatting oz to display
export function formatWeight(oz: number): string {
  if (oz >= 16) {
    const lbs = oz / 16;
    return `${lbs.toFixed(1)} lb`;
  }
  return `${oz.toFixed(0)} oz`;
}

// Helper for formatting percentages
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// Helper for formatting change indicators
export function formatChange(value: number): { text: string; isPositive: boolean } {
  const isPositive = value >= 0;
  const text = `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
  return { text, isPositive };
}
