import { useState, useMemo, useRef, useEffect } from 'react';
import { useLayoutElements, useRackAssignments, type RackAssignment } from '@/lib/api-client';

export interface LevelAllocation {
  level: number;
  trayCount: number;
}

export interface RackAllocation {
  rackElementId: string;
  levelAllocations: LevelAllocation[];
}

interface RackSelectorProps {
  farmId: string;
  value: RackAllocation | null;
  onChange: (value: RackAllocation | null) => void;
  trayCount: number; // Total trays being placed
}

interface RackMetadata {
  levels?: number;
  traysPerLevel?: number;
  trayCapacity?: number;
}

interface RackInfo {
  id: string;
  name: string;
  levels: number;
  traysPerLevel: number;
  totalCapacity: number;
  totalAvailable: number;
  assignments: RackAssignment[];
  levelOccupancy: Map<number, number>; // level -> trays currently on that level
}

export function RackSelector({ farmId, value, onChange, trayCount }: RackSelectorProps) {
  const { data: elements, isLoading: elementsLoading } = useLayoutElements(farmId);
  const { data: assignments, isLoading: assignmentsLoading } = useRackAssignments(farmId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDropdownOpen]);

  // Natural sort comparison for alphanumeric strings (e.g., "Rack 1", "Rack 2", "Rack 10")
  const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Get all grow racks with their occupancy info
  const racks = useMemo(() => {
    if (!elements) return [];

    const growRacks = elements.filter((el) => el.type === 'GROW_RACK');

    const rackInfos = growRacks.map((rack): RackInfo => {
      const metadata = rack.metadata as RackMetadata | undefined;
      const levels = metadata?.levels ?? 1;
      const traysPerLevel = metadata?.traysPerLevel ?? 6;
      const totalCapacity = levels * traysPerLevel;

      // Get assignments for this rack
      const rackAssignments = assignments?.filter((a) => a.rackElementId === rack.id) ?? [];

      // Calculate occupancy per level
      const levelOccupancy = new Map<number, number>();
      let totalOccupied = 0;
      for (let i = 1; i <= levels; i++) {
        levelOccupancy.set(i, 0);
      }
      for (const assignment of rackAssignments) {
        const current = levelOccupancy.get(assignment.level) ?? 0;
        levelOccupancy.set(assignment.level, current + assignment.trayCount);
        totalOccupied += assignment.trayCount;
      }

      return {
        id: rack.id,
        name: rack.name,
        levels,
        traysPerLevel,
        totalCapacity,
        totalAvailable: totalCapacity - totalOccupied,
        assignments: rackAssignments,
        levelOccupancy,
      };
    });

    // Sort racks alphabetically/numerically
    return rackInfos.sort((a, b) => naturalSort(a.name, b.name));
  }, [elements, assignments]);

  // Filter racks by search query
  const filteredRacks = useMemo(() => {
    if (!searchQuery.trim()) return racks;
    const query = searchQuery.toLowerCase();
    return racks.filter((rack) => rack.name.toLowerCase().includes(query));
  }, [racks, searchQuery]);

  const isLoading = elementsLoading || assignmentsLoading;

  // Get selected rack info
  const selectedRack = value ? racks.find((r) => r.id === value.rackElementId) : null;

  // Calculate total allocated trays
  const totalAllocated = value?.levelAllocations.reduce((sum, l) => sum + l.trayCount, 0) ?? 0;
  const remainingToAllocate = trayCount - totalAllocated;

  // Check if "Fill Rack" should be shown
  const canFillRack = selectedRack && trayCount > 0 && selectedRack.totalAvailable > 0;

  const getLevelAvailable = (rack: RackInfo, level: number) => {
    const occupied = rack.levelOccupancy.get(level) ?? 0;
    return rack.traysPerLevel - occupied;
  };

  const getLevelAllocated = (level: number) => {
    return value?.levelAllocations.find((l) => l.level === level)?.trayCount ?? 0;
  };

  const updateLevelAllocation = (level: number, newTrayCount: number) => {
    if (!selectedRack || !value) return;

    const available = getLevelAvailable(selectedRack, level);
    const currentLevelAllocation = getLevelAllocated(level);

    // Calculate max allowed: can't exceed available space OR remaining trays for the task
    // remainingToAllocate doesn't include current level, so add it back
    const maxAllowedByTask = remainingToAllocate + currentLevelAllocation;
    const maxAllowed = Math.min(available, maxAllowedByTask);
    const clampedCount = Math.max(0, Math.min(newTrayCount, maxAllowed));

    const existingAllocations = value.levelAllocations.filter((l) => l.level !== level);
    const newAllocations =
      clampedCount > 0
        ? [...existingAllocations, { level, trayCount: clampedCount }]
        : existingAllocations;

    // Sort by level
    newAllocations.sort((a, b) => a.level - b.level);

    onChange({
      rackElementId: value.rackElementId,
      levelAllocations: newAllocations,
    });
  };

  const handleFillRack = () => {
    if (!selectedRack) return;

    let remaining = trayCount;
    const allocations: LevelAllocation[] = [];

    // Fill levels from bottom to top
    for (let level = 1; level <= selectedRack.levels && remaining > 0; level++) {
      const available = getLevelAvailable(selectedRack, level);
      if (available > 0) {
        const toPlace = Math.min(remaining, available);
        allocations.push({ level, trayCount: toPlace });
        remaining -= toPlace;
      }
    }

    onChange({
      rackElementId: selectedRack.id,
      levelAllocations: allocations,
    });
  };

  const handleClearAllocations = () => {
    if (!selectedRack) return;
    onChange({
      rackElementId: selectedRack.id,
      levelAllocations: [],
    });
  };

  const handleSelectRack = (rack: RackInfo) => {
    onChange({ rackElementId: rack.id, levelAllocations: [] });
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleClearRack = () => {
    onChange(null);
    setSearchQuery('');
  };

  const getOccupancyColor = (occupied: number, capacity: number) => {
    const ratio = occupied / capacity;
    if (ratio >= 1) return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/50';
    if (ratio >= 0.8) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/50';
    return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50';
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
        Loading grow racks...
      </div>
    );
  }

  if (racks.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">
          No grow racks found in your farm layout.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Add grow racks in the Farm Layout page first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Searchable Rack Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Destination Rack</label>
        <div className="relative" ref={dropdownRef}>
          {/* Search input that doubles as display */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={selectedRack ? (isDropdownOpen ? searchQuery : selectedRack.name) : searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => {
                setIsDropdownOpen(true);
                if (selectedRack) setSearchQuery('');
              }}
              onClick={() => {
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              placeholder="Search or select a rack..."
              className="w-full px-3 py-2 pr-20 border rounded-md bg-background"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {selectedRack && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearRack();
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  if (!isDropdownOpen) inputRef.current?.focus();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Dropdown options */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredRacks.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No racks found matching "{searchQuery}"
                </div>
              ) : (
                filteredRacks.map((rack) => {
                  const isFull = rack.totalAvailable === 0;
                  const isSelected = selectedRack?.id === rack.id;
                  const occupied = rack.totalCapacity - rack.totalAvailable;

                  return (
                    <button
                      key={rack.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => handleSelectRack(rack)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className="font-medium">{rack.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getOccupancyColor(occupied, rack.totalCapacity)}`}>
                        {occupied}/{rack.totalCapacity}
                        {isFull ? ' FULL' : ` (${rack.totalAvailable} avail)`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected rack details */}
      {selectedRack && (
        <div className="space-y-3">
          {/* Allocation summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div>
              <p className="text-sm font-medium">
                {totalAllocated} of {trayCount} trays allocated
              </p>
              {remainingToAllocate > 0 && (
                <p className="text-xs text-muted-foreground">
                  {remainingToAllocate} remaining to place
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {totalAllocated > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllocations}
                  className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted"
                >
                  Clear
                </button>
              )}
              {canFillRack && (
                <button
                  type="button"
                  onClick={handleFillRack}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Fill Rack ({Math.min(trayCount, selectedRack.totalAvailable)} trays)
                </button>
              )}
            </div>
          </div>

          {/* Level allocation inputs */}
          <div>
            <label className="block text-sm font-medium mb-2">Trays per Level</label>
            <div className="space-y-2">
              {Array.from({ length: selectedRack.levels }, (_, i) => i + 1).map((level) => {
                const available = getLevelAvailable(selectedRack, level);
                const occupied = selectedRack.levelOccupancy.get(level) ?? 0;
                const allocated = getLevelAllocated(level);
                const isFull = available === 0;

                return (
                  <div
                    key={level}
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      allocated > 0
                        ? 'border-primary bg-primary/5'
                        : isFull
                        ? 'border-muted bg-muted/50 opacity-60'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-16">Level {level}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getOccupancyColor(
                          occupied,
                          selectedRack.traysPerLevel
                        )}`}
                      >
                        {occupied}/{selectedRack.traysPerLevel}
                      </span>
                      {available > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({available} available)
                        </span>
                      )}
                    </div>

                    {/* Tray count input */}
                    {!isFull && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateLevelAllocation(level, allocated - 1)}
                          disabled={allocated === 0}
                          className="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={available}
                          value={allocated}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            updateLevelAllocation(level, val);
                          }}
                          className="w-14 h-8 text-center border rounded-md bg-background"
                        />
                        <button
                          type="button"
                          onClick={() => updateLevelAllocation(level, allocated + 1)}
                          disabled={allocated >= available || remainingToAllocate <= 0}
                          className="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        {available > 0 && allocated === 0 && remainingToAllocate > 0 && (
                          <button
                            type="button"
                            onClick={() => updateLevelAllocation(level, Math.min(remainingToAllocate, available))}
                            className="ml-2 px-2 py-1 text-xs border rounded-md hover:bg-muted"
                          >
                            Fill ({Math.min(remainingToAllocate, available)})
                          </button>
                        )}
                      </div>
                    )}
                    {isFull && (
                      <span className="text-xs text-red-600 dark:text-red-400">Full</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Show what's currently on selected levels */}
          {value && value.levelAllocations.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Current contents on selected levels:
              </p>
              {value.levelAllocations.map(({ level }) => {
                const levelAssignments = selectedRack.assignments.filter(
                  (a) => a.level === level
                );
                if (levelAssignments.length === 0) return null;
                return (
                  <div key={level} className="mb-2">
                    <p className="text-xs font-medium">Level {level}:</p>
                    <div className="space-y-1 mt-1">
                      {levelAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded"
                        >
                          <span>{a.orderItem.product.name}</span>
                          <span className="text-muted-foreground">
                            {a.trayCount} tray{a.trayCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
