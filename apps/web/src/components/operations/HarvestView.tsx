import type { Task } from '@farm/shared';

interface HarvestViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted: boolean;
}

export default function HarvestView({ tasks, onTaskClick, showCompleted }: HarvestViewProps) {
  const harvestTasks = tasks.filter(t =>
    t.type === 'HARVESTING' &&
    (showCompleted || t.status !== 'COMPLETED')
  );

  return (
    <div className="border rounded-lg p-6 bg-card">
      <p className="text-muted-foreground text-center">
        Harvest view coming soon. {harvestTasks.length} harvest tasks.
      </p>
    </div>
  );
}
