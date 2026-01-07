import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Layers, Scissors } from 'lucide-react';
import { useOrders, useTasks } from '@/lib/api-client';
import { useFarmStore } from '@/stores/farm-store';

interface WeekStats {
  ordersThisWeek: number;
  traysToPlant: number;
  expectedHarvestOz: number;
}

function useWeekStats(farmId: string | undefined): {
  stats: WeekStats | null;
  isLoading: boolean;
} {
  const { data: orders, isLoading: ordersLoading } = useOrders(farmId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(farmId);

  const stats = useMemo(() => {
    if (!orders && !tasks) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start of this week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // End of this week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Count orders created this week
    const ordersThisWeek =
      orders?.filter((o) => {
        const createdAt = new Date(o.createdAt);
        return createdAt >= startOfWeek && createdAt < endOfWeek;
      }).length ?? 0;

    // Count trays to plant this week (SEED tasks)
    const seedTasks =
      tasks?.filter((t) => {
        if (t.type !== 'SEED') return false;
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate >= today && dueDate < endOfWeek;
      }) ?? [];

    // Calculate trays from order items (simplified - 1 task = 1 tray)
    const traysToPlant = seedTasks.length;

    // Calculate expected harvest this week
    const harvestTasks =
      tasks?.filter((t) => {
        if (t.type !== 'HARVESTING') return false;
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate >= today && dueDate < endOfWeek;
      }) ?? [];

    const expectedHarvestOz = harvestTasks.reduce((sum, t) => {
      return sum + (t.orderItem?.quantityOz ?? 0);
    }, 0);

    return {
      ordersThisWeek,
      traysToPlant,
      expectedHarvestOz,
    };
  }, [orders, tasks]);

  return {
    stats,
    isLoading: ordersLoading || tasksLoading,
  };
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
  subtext?: string;
}

function StatCard({ icon, label, value, href, subtext }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="border rounded-lg bg-card p-4 hover:border-primary transition-colors"
      >
        {content}
      </Link>
    );
  }

  return <div className="border rounded-lg bg-card p-4">{content}</div>;
}

export function WeekSummary() {
  const { currentFarmId } = useFarmStore();
  const { stats, isLoading } = useWeekStats(currentFarmId ?? undefined);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg bg-card p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-7 bg-muted rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        icon={<ShoppingCart className="w-4 h-4" />}
        label="This Week"
        value={stats.ordersThisWeek}
        subtext="Orders"
        href="/orders"
      />
      <StatCard
        icon={<Layers className="w-4 h-4" />}
        label="To Plant"
        value={stats.traysToPlant}
        subtext="Trays"
        href="/operations?type=SEED"
      />
      <StatCard
        icon={<Scissors className="w-4 h-4" />}
        label="To Harvest"
        value={`${stats.expectedHarvestOz} oz`}
        subtext="Expected"
        href="/operations?type=HARVESTING"
      />
    </div>
  );
}
