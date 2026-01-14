import { useState, useRef, useEffect } from 'react';
import { useProductSeedSupply, type SeedLotWithRemaining } from '@/lib/api-client';
import { ChevronDown, Plus, AlertTriangle, Package } from 'lucide-react';

export interface SeedLotSelection {
  supplyId: string | null;
  lotNumber: string;
  isNewLot: boolean;
  newLotData?: {
    quantity: number;
    unit: string;
    supplier: string;
    expiryDate?: string;
  };
}

interface SeedLotSelectorProps {
  farmId: string;
  productId: string | undefined;
  productName: string;
  seedWeight: number | null; // grams per tray
  seedUnit: string | null;
  traysNeeded: number;
  value: SeedLotSelection | null;
  onChange: (value: SeedLotSelection | null) => void;
}

const UNIT_OPTIONS = ['g', 'oz', 'lb', 'kg'];

export function SeedLotSelector({
  farmId,
  productId,
  productName,
  seedWeight,
  seedUnit,
  traysNeeded,
  value,
  onChange,
}: SeedLotSelectorProps) {
  const { data: seedSupply, isLoading } = useProductSeedSupply(farmId, productId);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNewLotForm, setShowNewLotForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // New lot form state
  const [newLotNumber, setNewLotNumber] = useState('');
  const [newLotQuantity, setNewLotQuantity] = useState('');
  const [newLotUnit, setNewLotUnit] = useState(seedUnit || 'g');
  const [newLotSupplier, setNewLotSupplier] = useState('');
  const [newLotExpiry, setNewLotExpiry] = useState('');

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
    if (!isDropdownOpen && !showNewLotForm) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (showNewLotForm) {
          setShowNewLotForm(false);
        } else if (isDropdownOpen) {
          setIsDropdownOpen(false);
        }
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDropdownOpen, showNewLotForm]);

  // Calculate seed usage for display
  const seedUsage = seedWeight && traysNeeded > 0
    ? { quantity: traysNeeded * seedWeight, unit: seedUnit || 'g' }
    : null;

  // Filter lots by search query
  const filteredLots = (seedSupply?.lots ?? []).filter((lot) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lot.lotNumber?.toLowerCase().includes(query) ||
      lot.supplier?.toLowerCase().includes(query)
    );
  });

  // Get display name for selected lot
  const getSelectedLotDisplay = () => {
    if (!value) return '';
    if (value.isNewLot) return `${value.lotNumber} (New)`;
    const lot = seedSupply?.lots.find((l) => l.lotNumber === value.lotNumber);
    if (lot) {
      return `${lot.lotNumber} (${lot.remainingQuantity.toFixed(0)}${lot.unit || 'g'} remaining)`;
    }
    return value.lotNumber;
  };

  const handleSelectLot = (lot: SeedLotWithRemaining) => {
    onChange({
      supplyId: seedSupply?.supply?.id || null,
      lotNumber: lot.lotNumber || '',
      isNewLot: false,
    });
    setIsDropdownOpen(false);
    setShowNewLotForm(false);
    setSearchQuery('');
  };

  const handleAddNewLot = () => {
    setShowNewLotForm(true);
    setIsDropdownOpen(false);
  };

  const handleSaveNewLot = () => {
    if (!newLotNumber.trim() || !newLotQuantity || !newLotSupplier.trim()) return;

    onChange({
      supplyId: seedSupply?.supply?.id || null,
      lotNumber: newLotNumber.trim(),
      isNewLot: true,
      newLotData: {
        quantity: parseFloat(newLotQuantity),
        unit: newLotUnit,
        supplier: newLotSupplier.trim(),
        expiryDate: newLotExpiry || undefined,
      },
    });
    setShowNewLotForm(false);
  };

  const handleCancelNewLot = () => {
    setShowNewLotForm(false);
    setNewLotNumber('');
    setNewLotQuantity('');
    setNewLotSupplier('');
    setNewLotExpiry('');
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setShowNewLotForm(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if selected lot has insufficient stock
  const selectedLot = value && !value.isNewLot
    ? seedSupply?.lots.find((l) => l.lotNumber === value.lotNumber)
    : null;
  const insufficientStock = selectedLot && seedUsage && selectedLot.remainingQuantity < seedUsage.quantity;

  if (isLoading) {
    return (
      <div className="p-3 border rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
        Loading seed lots...
      </div>
    );
  }

  // No supply exists for this product
  if (!seedSupply?.supply) {
    return (
      <div className="space-y-3">
        <div className="p-3 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-md">
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                No seed inventory for {productName}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Add this variety to Supplies &gt; Seeds to enable lot tracking, or enter a lot number manually below.
              </p>
            </div>
          </div>
        </div>
        {/* Fallback to free text input */}
        <div>
          <label className="block text-sm font-medium mb-1">Seed Lot (manual entry)</label>
          <input
            type="text"
            value={value?.lotNumber ?? ''}
            onChange={(e) =>
              onChange(e.target.value ? { supplyId: null, lotNumber: e.target.value, isNewLot: false } : null)
            }
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="e.g., LOT-2025-001"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Seed usage calculation */}
      {seedUsage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          <Package className="w-4 h-4" />
          <span>
            Seed Usage: <strong>{traysNeeded} trays</strong> x <strong>{seedWeight}{seedUnit || 'g'}/tray</strong> ={' '}
            <strong className="text-foreground">{seedUsage.quantity.toFixed(1)}{seedUsage.unit}</strong> total
          </span>
        </div>
      )}

      {/* Lot selector dropdown */}
      {!showNewLotForm && (
        <div>
          <label className="block text-sm font-medium mb-1">Seed Lot</label>
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={value ? (isDropdownOpen ? searchQuery : getSelectedLotDisplay()) : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isDropdownOpen) setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  if (value) setSearchQuery('');
                }}
                onClick={() => {
                  if (!isDropdownOpen) setIsDropdownOpen(true);
                }}
                placeholder="Select or search seed lots..."
                className="w-full px-3 py-2 pr-16 border rounded-md bg-background"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {value && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
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
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Dropdown options */}
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                {/* Add new lot option */}
                <button
                  type="button"
                  onClick={handleAddNewLot}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted border-b"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">Receive New Seed Lot</span>
                </button>

                {filteredLots.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {searchQuery ? `No lots matching "${searchQuery}"` : 'No seed lots in inventory'}
                  </div>
                ) : (
                  filteredLots.map((lot) => {
                    const isSelected = value?.lotNumber === lot.lotNumber;
                    const lowStock = seedUsage && lot.remainingQuantity < seedUsage.quantity;
                    const isExpired = lot.expiryDate && new Date(lot.expiryDate) < new Date();

                    return (
                      <button
                        key={lot.id}
                        type="button"
                        onClick={() => handleSelectLot(lot)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{lot.lotNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            lowStock
                              ? 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/50'
                              : 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50'
                          }`}>
                            {lot.remainingQuantity.toFixed(0)}{lot.unit || 'g'}
                            {lowStock && ' (low)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {lot.supplier && <span>{lot.supplier}</span>}
                          {lot.supplier && lot.purchaseDate && <span>·</span>}
                          {lot.purchaseDate && <span>Recv: {formatDate(lot.purchaseDate)}</span>}
                          {lot.expiryDate && (
                            <>
                              <span>·</span>
                              <span className={isExpired ? 'text-red-500' : ''}>
                                {isExpired ? 'Expired' : `Exp: ${formatDate(lot.expiryDate)}`}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insufficient stock warning */}
      {insufficientStock && (
        <div className="flex items-start gap-2 p-2 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-md">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-amber-800 dark:text-amber-200">Low stock warning</p>
            <p className="text-amber-600 dark:text-amber-400">
              This lot has {selectedLot?.remainingQuantity.toFixed(0)}{selectedLot?.unit || 'g'} remaining but you need {seedUsage?.quantity.toFixed(1)}{seedUsage?.unit}
            </p>
          </div>
        </div>
      )}

      {/* New lot inline form */}
      {showNewLotForm && (
        <div className="p-4 border rounded-md bg-muted/30 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Receive New Seed Lot</h4>
            <button type="button" onClick={handleCancelNewLot} className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Lot Number *</label>
              <input
                type="text"
                value={newLotNumber}
                onChange={(e) => setNewLotNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="e.g., SL-2026-001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Supplier *</label>
              <input
                type="text"
                value={newLotSupplier}
                onChange={(e) => setNewLotSupplier(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="e.g., Johnny's Seeds"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Weight Received *</label>
              <input
                type="number"
                value={newLotQuantity}
                onChange={(e) => setNewLotQuantity(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="500"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Unit</label>
              <select
                value={newLotUnit}
                onChange={(e) => setNewLotUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Expiry Date</label>
              <input
                type="date"
                value={newLotExpiry}
                onChange={(e) => setNewLotExpiry(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelNewLot}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewLot}
              disabled={!newLotNumber.trim() || !newLotQuantity || !newLotSupplier.trim()}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Use This Lot
            </button>
          </div>
        </div>
      )}

      {/* Selected lot display when form is shown */}
      {value && !showNewLotForm && value.isNewLot && (
        <div className="p-3 border border-green-300 bg-green-50 dark:bg-green-950/30 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                New Lot: {value.lotNumber}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {value.newLotData?.quantity}{value.newLotData?.unit} from {value.newLotData?.supplier}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-green-600 hover:text-green-800 dark:text-green-400"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
