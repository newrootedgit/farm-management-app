import { useFarmStore } from '@/stores/farm-store';
import { useEmployees } from '@/lib/api-client';

export default function EmployeesPage() {
  const { currentFarmId } = useFarmStore();
  const { data: employees, isLoading } = useEmployees(currentFarmId ?? undefined);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage employees.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage staff, schedules, and time tracking</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Active Employees</p>
          <p className="text-2xl font-bold">{employees?.filter(e => e.status === 'ACTIVE').length || 0}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">On Leave</p>
          <p className="text-2xl font-bold">{employees?.filter(e => e.status === 'ON_LEAVE').length || 0}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Shifts This Week</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Employee list placeholder */}
      <div className="border rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-semibold">Employee Management</h3>
        <p className="text-muted-foreground">Staff directory, scheduling, and time clock will appear here.</p>
      </div>
    </div>
  );
}
