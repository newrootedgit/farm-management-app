import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFarmStore, useUIStore } from '@/stores/farm-store';
import { useFarms, useFarm, useCreateFarm } from '@/lib/api-client';

type FarmRole = 'OWNER' | 'ADMIN' | 'FARM_MANAGER' | 'SALESPERSON' | 'FARM_OPERATOR';

// Role hierarchy for permission checks
const roleHierarchy: Record<FarmRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  FARM_MANAGER: 3,
  SALESPERSON: 2,
  FARM_OPERATOR: 1,
};

const hasRole = (userRole: FarmRole | undefined, minRole: FarmRole): boolean => {
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[minRole];
};

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: FarmRole; // If not set, all roles can access
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Operations', href: '/operations', icon: ClipboardIcon },
  { name: 'Orders', href: '/orders', icon: CalendarIcon, minRole: 'FARM_MANAGER' },
  { name: 'Varieties & Mixes', href: '/inventory', icon: PackageIcon, minRole: 'FARM_MANAGER' },
  { name: 'Supplies & Inventory', href: '/supplies', icon: BoxIcon, minRole: 'FARM_MANAGER' },
  { name: 'Customers', href: '/customers', icon: CustomerIcon, minRole: 'SALESPERSON' },
  { name: 'Store', href: '/store', icon: StoreIcon, minRole: 'ADMIN' },
  { name: 'Delivery', href: '/delivery', icon: TruckIcon, minRole: 'FARM_MANAGER' },
  { name: 'Farm Layout', href: '/layout', icon: MapIcon, minRole: 'ADMIN' },
  { name: 'Team', href: '/team', icon: UsersIcon, minRole: 'ADMIN' },
  { name: 'Financials', href: '/financials', icon: DollarIcon, minRole: 'ADMIN' },
  { name: 'Wiki', href: '/wiki', icon: BookIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen } = useUIStore();
  const { currentFarmId, setCurrentFarm } = useFarmStore();
  const { data: farms } = useFarms();
  const { data: currentFarm } = useFarm(currentFarmId ?? undefined);
  const createFarm = useCreateFarm();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [createError, setCreateError] = useState('');

  // Auto-select first farm if none selected but farms exist
  useEffect(() => {
    if (!currentFarmId && farms && farms.length > 0) {
      setCurrentFarm(farms[0].id);
    }
  }, [currentFarmId, farms, setCurrentFarm]);

  // Get user's role for current farm
  const userRole = (currentFarm?.role as FarmRole) ?? undefined;

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!item.minRole) return true; // No role required
    return hasRole(userRole, item.minRole);
  });

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newFarmName.trim()) {
      setCreateError('Name required');
      return;
    }

    const slug = newFarmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      const farm = await createFarm.mutateAsync({
        name: newFarmName.trim(),
        slug,
      });
      setCurrentFarm(farm.id);
      setNewFarmName('');
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b">
        <img
          src="/rooted-robotics-logo.png"
          alt="Rooted Planner"
          className="h-10 w-auto"
        />
      </div>

      {/* Farm Selector */}
      <div className="p-4 border-b">
        <label className="text-xs font-medium text-muted-foreground">Current Farm</label>
        {farms && farms.length > 0 ? (
          <select
            value={currentFarmId || ''}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setShowCreateForm(true);
              } else if (e.target.value) {
                setCurrentFarm(e.target.value);
              }
            }}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
            <option value="__new__">+ Add new farm</option>
          </select>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left hover:bg-accent"
          >
            + Create farm
          </button>
        )}

        {/* Inline Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateFarm} className="mt-3 space-y-2">
            <input
              type="text"
              value={newFarmName}
              onChange={(e) => setNewFarmName(e.target.value)}
              placeholder="Farm name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              autoFocus
            />
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFarmName('');
                  setCreateError('');
                }}
                className="flex-1 px-2 py-1 text-xs border rounded hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFarm.isPending}
                className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {createFarm.isPending ? '...' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        Rooted Planner v0.1.0
      </div>
    </aside>
  );
}

// Simple icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function CustomerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}
