import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Calendar } from 'lucide-react';
import { useTasks } from '@/lib/api-client';
import { useFarmStore } from '@/stores/farm-store';

interface HarvestTask {
  id: string;
  dueDate: string;
  productName: string;
  customerName: string;
  orderNumber: string | null;
  quantityOz: number;
}

interface DayGroup {
  date: Date;
  label: string;
  tasks: HarvestTask[];
  totalOz: number;
}

function useHarvestForecast(farmId: string | undefined, days: number = 7): {
  groups: DayGroup[];
  isLoading: boolean;
} {
  const { data: tasks, isLoading } = useTasks(farmId);

  const groups = useMemo(() => {
    if (!tasks) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    // Filter harvest tasks in the date range
    const harvestTasks = tasks
      .filter((t) => {
        if (t.type !== 'HARVESTING') return false;
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < endDate;
      })
      .map((t) => ({
        id: t.id,
        dueDate: t.dueDate! as unknown as string,
        productName: t.orderItem?.product?.name || t.title || 'Unknown',
        customerName: t.orderItem?.order?.customer ?? 'Unknown',
        orderNumber: t.orderItem?.order?.orderNumber ?? null,
        quantityOz: t.orderItem?.quantityOz ?? 0,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Group by date
    const groupMap = new Map<string, HarvestTask[]>();

    harvestTasks.forEach((task) => {
      const dateKey = new Date(task.dueDate).toDateString();
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(task);
    });

    // Convert to array with labels
    const result: DayGroup[] = [];

    groupMap.forEach((tasks, dateKey) => {
      const date = new Date(dateKey);
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();

      let label: string;
      if (isToday) {
        label = 'Today';
      } else if (isTomorrow) {
        label = 'Tomorrow';
      } else {
        label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      result.push({
        date,
        label,
        tasks,
        totalOz: tasks.reduce((sum, t) => sum + t.quantityOz, 0),
      });
    });

    return result;
  }, [tasks, days]);

  return { groups, isLoading };
}

export function HarvestForecastTable() {
  const { currentFarmId } = useFarmStore();
  const { groups, isLoading } = useHarvestForecast(currentFarmId ?? undefined);

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-card">
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = groups.length === 0;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          Harvest Forecast (7 Days)
        </h2>
        <Link to="/operations?type=HARVESTING" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>

      {isEmpty ? (
        <div className="p-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No harvests scheduled in the next 7 days</p>
        </div>
      ) : (
        <div className="divide-y">
          {groups.map((group) => (
            <div key={group.date.toISOString()} className="px-4 py-3">
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">
                  {group.label}
                  {group.label !== 'Today' && group.label !== 'Tomorrow' && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      - {group.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {group.totalOz} oz total
                </span>
              </div>

              {/* Tasks for this day */}
              <div className="space-y-1">
                {group.tasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/operations"
                    className="flex items-center justify-between py-2 px-3 -mx-3 rounded hover:bg-muted/50 transition-colors text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{task.productName}</span>
                      <span className="mx-2 text-muted-foreground">·</span>
                      <span className="text-muted-foreground truncate">{task.customerName}</span>
                      {task.orderNumber && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{task.orderNumber}
                        </span>
                      )}
                    </div>
                    <span className="font-medium ml-4">{task.quantityOz} oz</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
