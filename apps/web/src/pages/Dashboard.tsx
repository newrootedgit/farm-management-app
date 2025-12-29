import { Link } from 'react-router-dom';
import { useFarmStore } from '@/stores/farm-store';
import { useFarm, useFarms, useZones, useEmployees } from '@/lib/api-client';

export default function Dashboard() {
  const { currentFarmId, setCurrentFarm } = useFarmStore();
  const { data: farms } = useFarms();
  const { data: farm } = useFarm(currentFarmId ?? undefined);
  const { data: zones } = useZones(currentFarmId ?? undefined);
  const { data: employees } = useEmployees(currentFarmId ?? undefined);

  // If no farm selected but farms exist, show farm selector
  if (!currentFarmId && farms && farms.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Farm Management</h1>
          <p className="text-muted-foreground">Select a farm to get started</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((f) => (
            <button
              key={f.id}
              onClick={() => setCurrentFarm(f.id)}
              className="border rounded-lg p-6 bg-card text-left hover:border-primary transition-colors"
            >
              <h3 className="font-semibold text-lg">{f.name}</h3>
              <p className="text-sm text-muted-foreground">/{f.slug}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // If no farms at all, show create prompt
  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🌾</div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Farm Management</h1>
          <p className="text-muted-foreground mb-6">
            Create your first farm to start managing inventory, employees, and planning.
          </p>
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Create Your First Farm
          </button>
        </div>
      </div>
    );
  }

  // Dashboard with farm selected
  const quickLinks = [
    { name: 'Farm Layout', href: '/layout', icon: '🗺️', description: 'View and edit farm zones' },
    { name: 'Inventory', href: '/inventory', icon: '📦', description: 'Manage products and stock' },
    { name: 'Employees', href: '/employees', icon: '👥', description: 'Staff and scheduling' },
    { name: 'Planning', href: '/planning', icon: '📅', description: 'Tasks and crop plans' },
    { name: 'Financials', href: '/financials', icon: '💰', description: 'Budgets and reports' },
    { name: 'Wiki', href: '/wiki', icon: '📚', description: 'SOPs and documentation' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{farm?.name || 'Dashboard'}</h1>
        <p className="text-muted-foreground">Overview and quick actions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Zones</p>
          <p className="text-2xl font-bold">{zones?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Employees</p>
          <p className="text-2xl font-bold">{employees?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Pending Tasks</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Low Stock Items</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="border rounded-lg p-4 bg-card hover:border-primary transition-colors flex items-center gap-4"
            >
              <div className="text-3xl">{link.icon}</div>
              <div>
                <h3 className="font-medium">{link.name}</h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="border rounded-lg p-6 bg-card text-center text-muted-foreground">
          Activity feed will appear here as you use the app.
        </div>
      </div>
    </div>
  );
}
