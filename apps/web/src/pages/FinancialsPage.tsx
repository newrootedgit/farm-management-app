import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useOrders, useTasks, useCustomers } from '@/lib/api-client';
import { useAnalytics, formatWeight } from '@/hooks/useAnalytics';
import {
  StatCard,
  RevenueChart,
  OrderStatusChart,
  TopCustomersList,
  TaskMetricsChart,
  YieldVarianceChart,
  CompletionGauge,
} from '@/components/analytics';
import { Package, TrendingUp, Users, CheckCircle, AlertTriangle } from 'lucide-react';

type PeriodFilter = 'mtd' | 'ytd' | '30d' | '90d';

export default function FinancialsPage() {
  const { currentFarmId } = useFarmStore();
  const [period, setPeriod] = useState<PeriodFilter>('mtd');

  const { data: orders } = useOrders(currentFarmId ?? undefined);
  const { data: tasks } = useTasks(currentFarmId ?? undefined);
  const { data: customers } = useCustomers(currentFarmId ?? undefined);

  const analytics = useAnalytics({
    orders: orders || [],
    tasks: tasks || [],
    customers: customers || [],
  });

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to view financials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Production metrics and business insights</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Filter */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['30d', 'mtd', '90d', 'ytd'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Volume (MTD)"
          value={formatWeight(analytics.totalOzThisMonth)}
          change={{ value: analytics.monthOverMonthChange, label: 'vs last month' }}
          trend={analytics.monthOverMonthChange >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        />
        <StatCard
          title="Total Orders"
          value={analytics.totalOrders}
          subtitle={`Avg ${analytics.avgItemsPerOrder.toFixed(1)} items per order`}
          icon={<Package className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Active Customers"
          value={analytics.activeCustomers}
          subtitle={`${analytics.totalCustomers} total customers`}
          icon={<Users className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          title="Task Completion"
          value={`${analytics.taskCompletionRate.toFixed(0)}%`}
          subtitle={analytics.overdueTaskCount > 0 ? `${analytics.overdueTaskCount} overdue` : 'All on track'}
          trend={analytics.taskCompletionRate >= 90 ? 'up' : analytics.taskCompletionRate >= 70 ? 'neutral' : 'down'}
          icon={
            analytics.overdueTaskCount > 0
              ? <AlertTriangle className="w-5 h-5 text-yellow-600" />
              : <CheckCircle className="w-5 h-5 text-green-600" />
          }
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - takes 2 columns */}
        <div className="lg:col-span-2 border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Production Volume</h3>
          <RevenueChart data={analytics.revenueByMonth} type="area" height={280} />
        </div>

        {/* Order Status */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Order Status</h3>
          <OrderStatusChart data={analytics.ordersByStatus} height={280} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
          <TopCustomersList data={analytics.topCustomers} maxItems={5} />
        </div>

        {/* Task Metrics */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Tasks by Type</h3>
          <TaskMetricsChart data={analytics.tasksByType} height={220} />
        </div>

        {/* Yield Accuracy */}
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold">Yield Accuracy</h3>
            <div className="text-right">
              <p className="text-2xl font-bold">{analytics.avgYieldAccuracy.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Average accuracy</p>
            </div>
          </div>
          {analytics.yieldVariance.length > 0 ? (
            <YieldVarianceChart data={analytics.yieldVariance} maxItems={4} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">No harvest data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Production Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Gauge */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Production Efficiency</h3>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <CompletionGauge rate={analytics.taskCompletionRate} size={140} />
              <p className="mt-2 text-sm text-muted-foreground">Task Completion</p>
            </div>
            <div className="text-center">
              <CompletionGauge rate={analytics.avgYieldAccuracy} size={140} />
              <p className="mt-2 text-sm text-muted-foreground">Yield Accuracy</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold">{analytics.totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold">{analytics.activeCustomers}</p>
              <p className="text-sm text-muted-foreground">Active Customers</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold">{formatWeight(analytics.totalOzThisMonth)}</p>
              <p className="text-sm text-muted-foreground">Volume This Month</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className={`text-3xl font-bold ${analytics.overdueTaskCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {analytics.overdueTaskCount}
              </p>
              <p className="text-sm text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
