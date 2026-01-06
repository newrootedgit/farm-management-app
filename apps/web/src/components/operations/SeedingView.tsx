import type { Task } from '@farm/shared';

interface SeedingViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted: boolean;
}

export default function SeedingView({ tasks, onTaskClick, showCompleted }: SeedingViewProps) {
  const seedingTasks = tasks.filter(t =>
    (t.type === 'SOAK' || t.type === 'SEED') &&
    (showCompleted || t.status !== 'COMPLETED')
  );

  return (
    <div className="border rounded-lg p-6 bg-card">
      <p className="text-muted-foreground text-center">
        Seeding view coming soon. {seedingTasks.length} seeding tasks.
      </p>
    </div>
  );
}
