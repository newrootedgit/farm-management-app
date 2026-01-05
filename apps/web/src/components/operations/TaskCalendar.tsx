import type { Task } from '@farm/shared';

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted: boolean;
}

export default function TaskCalendar({ tasks, onTaskClick, showCompleted }: TaskCalendarProps) {
  const filteredTasks = tasks.filter(t => showCompleted || t.status !== 'COMPLETED');

  return (
    <div className="border rounded-lg p-6 bg-card">
      <p className="text-muted-foreground text-center">
        Calendar view coming soon. {filteredTasks.length} tasks available.
      </p>
    </div>
  );
}
