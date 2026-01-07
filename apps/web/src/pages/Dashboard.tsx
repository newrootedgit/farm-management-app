import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFarmStore } from '@/stores/farm-store';
import { useFarm, useFarms, useCreateFarm } from '@/lib/api-client';
import { PriorityPanel } from '@/components/dashboard/PriorityPanel';
import { CapacityOverview } from '@/components/dashboard/CapacityOverview';
import { WeekSummary } from '@/components/dashboard/WeekSummary';
import { HarvestForecastTable } from '@/components/dashboard/HarvestForecastTable';

export default function Dashboard() {
  const { currentFarmId, setCurrentFarm } = useFarmStore();
  const { data: farms } = useFarms();
  const { data: farm } = useFarm(currentFarmId ?? undefined);

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
    { name: 'Orders', href: '/orders', icon: '📅', description: 'Add and manage orders' },
    { name: 'Operations', href: '/operations', icon: '⚙️', description: 'Daily task management' },
    { name: 'Wiki', href: '/wiki', icon: '📚', description: 'SOPs and documentation' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{farm?.name || 'Dashboard'}</h1>
        <p className="text-muted-foreground">Overview and quick actions</p>
      </div>

      {/* Main Grid - Priority Panel + Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriorityPanel />
        </div>
        <div>
          <CapacityOverview />
        </div>
      </div>

      {/* Week Summary Stats */}
      <WeekSummary />

      {/* Harvest Forecast */}
      <HarvestForecastTable />

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="border rounded-lg p-4 bg-card hover:border-primary transition-colors text-center"
            >
              <div className="text-2xl mb-2">{link.icon}</div>
              <h3 className="font-medium text-sm">{link.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 hidden md:block">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
