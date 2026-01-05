import type { Task } from '@farm/shared';

interface TransplantViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted: boolean;
}

export default function TransplantView({ tasks, onTaskClick, showCompleted }: TransplantViewProps) {
  const transplantTasks = tasks.filter(t =>
    t.type === 'MOVE_TO_LIGHT' &&
    (showCompleted || t.status !== 'COMPLETED')
  );

  return (
    <div className="border rounded-lg p-6 bg-card">
      <p className="text-muted-foreground text-center">
        Transplant view coming soon. {transplantTasks.length} transplant tasks.
      </p>
    </div>
  );
}
