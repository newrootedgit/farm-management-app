import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface TaskFilterState {
  taskTypes: string[];
  customerId: string | null;
  productId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  status: 'all' | 'pending' | 'completed';
}

export const defaultFilters: TaskFilterState = {
  taskTypes: [],
  customerId: null,
  productId: null,
  dateFrom: null,
  dateTo: null,
  status: 'all',
};

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  customers: { id: string; name: string }[];
  products: { id: string; name: string }[];
  onClear: () => void;
}

const TASK_TYPE_OPTIONS = [
  { value: 'SOAK', label: 'Soak', icon: '💧' },
  { value: 'SEED', label: 'Seed', icon: '🌱' },
  { value: 'MOVE_TO_LIGHT', label: 'Light', icon: '☀️' },
  { value: 'HARVESTING', label: 'Harvest', icon: '✂️' },
];

export function TaskFilters({
  filters,
  onChange,
  customers,
  products,
  onClear,
}: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.taskTypes.length > 0 ||
    filters.customerId ||
    filters.productId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.status !== 'all';

  const activeFilterCount = [
    filters.taskTypes.length > 0,
    filters.customerId,
    filters.productId,
    filters.dateFrom || filters.dateTo,
    filters.status !== 'all',
  ].filter(Boolean).length;

  const toggleTaskType = (type: string) => {
    const newTypes = filters.taskTypes.includes(type)
      ? filters.taskTypes.filter((t) => t !== type)
      : [...filters.taskTypes, type];
    onChange({ ...filters, taskTypes: newTypes });
  };

  return (
    <div className="bg-card border rounded-lg">
      {/* Filter Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t space-y-4">
          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-3"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}

          {/* Task Types */}
          <div className="pt-3">
            <label className="block text-sm font-medium mb-2">Task Type</label>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  onClick={() => toggleTaskType(type.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    filters.taskTypes.includes(type.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium mb-2">Customer</label>
            <select
              value={filters.customerId || ''}
              onChange={(e) =>
                onChange({ ...filters, customerId: e.target.value || null })
              }
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={filters.productId || ''}
              onChange={(e) =>
                onChange({ ...filters, productId: e.target.value || null })
              }
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) =>
                  onChange({ ...filters, dateFrom: e.target.value || null })
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) =>
                  onChange({ ...filters, dateTo: e.target.value || null })
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="flex gap-2">
              {(['all', 'pending', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => onChange({ ...filters, status })}
                  className={`px-3 py-1.5 text-sm rounded-md border capitalize transition-colors ${
                    filters.status === status
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline filters for quick access
interface QuickFiltersProps {
  selectedTypes: string[];
  onToggleType: (type: string) => void;
  status: 'all' | 'pending' | 'completed';
  onStatusChange: (status: 'all' | 'pending' | 'completed') => void;
}

export function QuickFilters({
  selectedTypes,
  onToggleType,
  status,
  onStatusChange,
}: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Task Type Pills */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Type:</span>
        <div className="flex gap-1">
          {TASK_TYPE_OPTIONS.map((type) => (
            <button
              key={type.value}
              onClick={() => onToggleType(type.value)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedTypes.length === 0 || selectedTypes.includes(type.value)
                  ? 'bg-muted'
                  : 'opacity-40 hover:opacity-100'
              }`}
              title={type.label}
            >
              {type.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Status Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as 'all' | 'pending' | 'completed')}
          className="px-2 py-1 text-sm border rounded-md bg-background"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
  );
}
