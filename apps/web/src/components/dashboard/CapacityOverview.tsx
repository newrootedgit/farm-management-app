import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLayoutElements, useRackAssignments } from '@/lib/api-client';
import { useFarmStore } from '@/stores/farm-store';

interface CapacityStats {
  totalCapacity: number;
  totalOccupied: number;
  percentUsed: number;
  rackCount: number;
  fullRacks: number;
  availableRacks: number;
}

function useCapacityStats(farmId: string | undefined): {
  stats: CapacityStats | null;
  isLoading: boolean;
} {
  const { data: elements, isLoading: elementsLoading } = useLayoutElements(farmId);
  const { data: assignments, isLoading: assignmentsLoading } = useRackAssignments(farmId);

  const stats = useMemo(() => {
    if (!elements) return null;

    const racks = elements.filter((el) => el.type === 'GROW_RACK');
    let totalCapacity = 0;
    let totalOccupied = 0;
    let fullRacks = 0;

    racks.forEach((rack) => {
      const metadata = rack.metadata as { levels?: number; traysPerLevel?: number } | null;
      const levels = metadata?.levels ?? 1;
      const traysPerLevel = metadata?.traysPerLevel ?? 6;
      const rackCapacity = levels * traysPerLevel;
      totalCapacity += rackCapacity;

      // Count occupied trays for this rack
      const rackAssignments = assignments?.filter(
        (a) => a.rackElementId === rack.id && a.isActive
      );
      const occupied = rackAssignments?.reduce((sum, a) => sum + a.trayCount, 0) ?? 0;
      totalOccupied += occupied;

      if (occupied >= rackCapacity) {
        fullRacks++;
      }
    });

    return {
      totalCapacity,
      totalOccupied,
      percentUsed: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      rackCount: racks.length,
      fullRacks,
      availableRacks: racks.length - fullRacks,
    };
  }, [elements, assignments]);

  return {
    stats,
    isLoading: elementsLoading || assignmentsLoading,
  };
}

export function CapacityOverview() {
  const { currentFarmId } = useFarmStore();
  const { stats, isLoading } = useCapacityStats(currentFarmId ?? undefined);

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-card p-4">
        <div className="h-5 bg-muted rounded w-28 mb-3 animate-pulse" />
        <div className="h-4 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  if (!stats || stats.rackCount === 0) {
    return (
      <div className="border rounded-lg bg-card p-4">
        <h3 className="font-semibold text-sm mb-2">Rack Capacity</h3>
        <p className="text-sm text-muted-foreground">
          No grow racks configured.{' '}
          <Link to="/layout" className="text-primary hover:underline">
            Add racks
          </Link>
        </p>
      </div>
    );
  }

  // Color based on usage
  const getBarColor = (percent: number) => {
    if (percent < 50) return 'bg-emerald-500';
    if (percent < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Link to="/layout" className="block border rounded-lg bg-card p-4 hover:border-primary transition-colors">
      <h3 className="font-semibold text-sm mb-3">Rack Capacity</h3>

      {/* Progress bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${getBarColor(stats.percentUsed)}`}
          style={{ width: `${stats.percentUsed}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">{stats.percentUsed}%</span>
        <span className="text-sm text-muted-foreground">
          {stats.totalOccupied} / {stats.totalCapacity} trays
        </span>
      </div>

      {/* Rack counts */}
      <p className="text-xs text-muted-foreground mt-2">
        {stats.rackCount} rack{stats.rackCount !== 1 ? 's' : ''}
        {stats.fullRacks > 0 && ` (${stats.fullRacks} full)`}
        {stats.availableRacks > 0 && ` · ${stats.availableRacks} with space`}
      </p>
    </Link>
  );
}
