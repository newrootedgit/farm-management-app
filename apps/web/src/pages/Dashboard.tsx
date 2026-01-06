import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFarmStore } from '@/stores/farm-store';
import { useFarm, useFarms, useCreateFarm, useTasks } from '@/lib/api-client';

// Task type colors - Earth tones (differentiated from competitor)
const TASK_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SOAK: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Soaking' },
  SEED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Seeding' },
  MOVE_TO_LIGHT: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Light Stage' },
  HARVESTING: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Harvest' },
};

export default function Dashboard() {
  const { currentFarmId, setCurrentFarm } = useFarmStore();
  const { data: farms } = useFarms();
  const { data: farm } = useFarm(currentFarmId ?? undefined);
  const { data: allTasks } = useTasks(currentFarmId ?? undefined);

  // Calculate task stats
  const taskStats = useMemo(() => {
    if (!allTasks) return { pending: 0, overdue: 0, todayDue: 0, todayCompleted: 0, todayTasks: [], harvestForecast: [] };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pending = allTasks.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length;
    const overdue = allTasks.filter((t: any) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;
      return dueDate && dueDate < today;
    }).length;

    const todayTasks = allTasks.filter((t: any) => {
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;
      return dueDate && dueDate >= today && dueDate < todayEnd;
    });

    const todayDue = todayTasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
    const todayCompleted = todayTasks.filter((t: any) => t.status === 'COMPLETED').length;

    // Group today's tasks by type
    const todayByType = todayTasks.reduce((acc: Record<string, any[]>, task: any) => {
      const type = task.type || 'OTHER';
      if (!acc[type]) acc[type] = [];
      acc[type].push(task);
      return acc;
    }, {});

    // Harvest forecast - next 7 days
    const harvestForecast = allTasks
      .filter((t: any) => {
        if (t.type !== 'HARVESTING') return false;
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        return dueDate && dueDate >= today && dueDate < sevenDaysOut;
      })
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10);

    return { pending, overdue, todayDue, todayCompleted, todayTasks: todayByType, harvestForecast };
  }, [allTasks]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [farmSlug, setFarmSlug] = useState('');
  const [error, setError] = useState('');

  const createFarm = useCreateFarm();

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!farmName.trim()) {
      setError('Farm name is required');
      return;
    }

    const slug = farmSlug.trim() || farmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      const newFarm = await createFarm.mutateAsync({
        name: farmName.trim(),
        slug,
      });
      setCurrentFarm(newFarm.id);
      setShowCreateForm(false);
      setFarmName('');
      setFarmSlug('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create farm');
    }
  };

  // If no farm selected but farms exist, show farm selector
  if (!currentFarmId && farms && farms.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Rooted Planner</h1>
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
          {!showCreateForm ? (
            <>
              <div className="text-6xl mb-6">🌾</div>
              <h1 className="text-2xl font-bold mb-2">Welcome to Rooted Planner</h1>
              <p className="text-muted-foreground mb-6">
                Create your first farm to start managing inventory, employees, and planning.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Create Your First Farm
              </button>
            </>
          ) : (
            <div className="text-left border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-bold mb-4">Create New Farm</h2>
              <form onSubmit={handleCreateFarm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Farm Name *</label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="My Farm"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug (URL-friendly name)</label>
                  <input
                    type="text"
                    value={farmSlug}
                    onChange={(e) => setFarmSlug(e.target.value)}
                    placeholder="my-farm (auto-generated if empty)"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFarmName('');
                      setFarmSlug('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createFarm.isPending}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {createFarm.isPending ? 'Creating...' : 'Create Farm'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard with farm selected
  const quickLinks = [
    { name: 'Farm Layout', href: '/layout', icon: '🗺️', description: 'View and edit farm zones' },
    { name: 'Varieties', href: '/inventory', icon: '🌱', description: 'Microgreen variety data' },
    { name: 'Employees', href: '/employees', icon: '👥', description: 'Staff and scheduling' },
    { name: 'Planning', href: '/planning', icon: '📅', description: 'Orders and production tasks' },
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

      {/* Production Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className={`text-2xl font-bold ${taskStats.overdue > 0 ? 'text-red-600' : ''}`}>
            {taskStats.overdue}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Due Today</p>
          <p className={`text-2xl font-bold ${taskStats.todayDue > 0 ? 'text-amber-600' : ''}`}>
            {taskStats.todayDue}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Completed Today</p>
          <p className="text-2xl font-bold text-emerald-600">{taskStats.todayCompleted}</p>
        </div>
        <Link to="/operations" className="border rounded-lg p-4 bg-card hover:border-primary transition-colors">
          <p className="text-sm text-muted-foreground">Total Pending</p>
          <p className="text-2xl font-bold">{taskStats.pending}</p>
        </Link>
      </div>

      {/* Today's Batches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Today's Batches</h2>
          <Link to="/operations" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {Object.keys(taskStats.todayTasks).length === 0 ? (
          <div className="border rounded-lg p-6 bg-card text-center text-muted-foreground">
            No tasks scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['SOAK', 'SEED', 'MOVE_TO_LIGHT', 'HARVESTING'].map((type) => {
              const tasks = (taskStats.todayTasks as Record<string, any[]>)[type] || [];
              const style = TASK_TYPE_STYLES[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type };
              const pendingCount = tasks.filter((t: any) => t.status !== 'COMPLETED').length;
              const completedCount = tasks.filter((t: any) => t.status === 'COMPLETED').length;

              if (tasks.length === 0) return null;

              return (
                <Link
                  key={type}
                  to={`/operations?type=${type}`}
                  className="border rounded-lg p-4 bg-card hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{tasks.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingCount} pending · {completedCount} done
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Harvest Forecast */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Harvest Forecast (7 Days)</h2>
          <Link to="/operations?view=harvest" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {taskStats.harvestForecast.length === 0 ? (
          <div className="border rounded-lg p-6 bg-card text-center text-muted-foreground">
            No harvests scheduled in the next 7 days.
          </div>
        ) : (
          <div className="border rounded-lg bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-sm font-medium">Product</th>
                  <th className="text-left px-4 py-2 text-sm font-medium">Customer</th>
                  <th className="text-right px-4 py-2 text-sm font-medium">Qty (oz)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {taskStats.harvestForecast.map((task: any) => (
                  <tr key={task.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">
                      {new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {task.orderItem?.product?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {task.orderItem?.order?.customerName || task.orderItem?.order?.customer?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {task.orderItem?.quantityOz || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
