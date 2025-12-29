import { useFarmStore } from '@/stores/farm-store';

export default function PlanningPage() {
  const { currentFarmId } = useFarmStore();

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to access planning.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farm Planning</h1>
          <p className="text-muted-foreground">Seasonal planning, crop rotation, and task management</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
            New Season
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Add Task
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Active Season</p>
          <p className="text-lg font-bold">None</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Pending Tasks</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Crop Plans</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Due This Week</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Calendar placeholder */}
      <div className="border rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-semibold">Planning Calendar</h3>
        <p className="text-muted-foreground">Task calendar and crop planning timeline will appear here.</p>
        <p className="text-sm text-muted-foreground mt-2">Uses @fullcalendar/react</p>
      </div>
    </div>
  );
}
