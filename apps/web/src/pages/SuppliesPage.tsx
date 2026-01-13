import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFarmStore } from '@/stores/farm-store';
import { useToast } from '@/components/ui/Toast';
import {
  useSupplyCategories,
  useSeedDefaultSupplyCategories,
  useCreateSupplyCategory,
  useSupplies,
  useCreateSupply,
  useUpdateSupply,
  useDeleteSupply,
  useAllSupplyPurchases,
  useCreateSupplyPurchase,
  useDeleteSupplyPurchase,
  useSupplyUsage,
  useCreateSupplyUsage,
  useInventoryCheck,
  useRecalculateInventory,
  useProducts,
  usePackageTypes,
  SupplyWithRelations,
} from '@/lib/api-client';
import type { SupplyUsageType } from '@farm/shared';

type TabType = 'stock' | 'inventory' | 'purchases' | 'usage';

const formatCurrency = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

export default function SuppliesPage() {
  const { currentFarmId } = useFarmStore();
  const { showToast } = useToast();

  // Tab state - support URL param ?tab=purchases for deep linking
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['stock', 'inventory', 'purchases', 'usage'];
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'stock'
  );

  // Sync tab state when URL param changes (for same-page navigation)
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Data hooks
  const { data: categories, isLoading: categoriesLoading } = useSupplyCategories(currentFarmId);
  const { data: supplies, isLoading: suppliesLoading } = useSupplies(currentFarmId);
  const { data: products } = useProducts(currentFarmId ?? undefined);
  const { data: packageTypes } = usePackageTypes(currentFarmId ?? undefined);
  const seedDefaultCategories = useSeedDefaultSupplyCategories(currentFarmId ?? '');
  const createSupplyCategory = useCreateSupplyCategory(currentFarmId ?? '');
  const createSupply = useCreateSupply(currentFarmId ?? '');
  const updateSupply = useUpdateSupply(currentFarmId ?? '');
  const deleteSupply = useDeleteSupply(currentFarmId ?? '');

  // Filter state
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');

  // Supply form state
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  const [editingSupply, setEditingSupply] = useState<SupplyWithRelations | null>(null);
  const [supplyFormError, setSupplyFormError] = useState<string | null>(null);
  const [supplyName, setSupplyName] = useState('');
  const [supplyCategoryId, setSupplyCategoryId] = useState('');
  const [supplyProductId, setSupplyProductId] = useState('');
  const [supplyPackageTypeId, setSupplyPackageTypeId] = useState('');

  // New category inline form state
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Purchase form state
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseSupplyId, setPurchaseSupplyId] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [purchaseTotalCost, setPurchaseTotalCost] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseLotNumber, setPurchaseLotNumber] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseFormError, setPurchaseFormError] = useState<string | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false);

  // Usage form state
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [usageSupplyId, setUsageSupplyId] = useState('');
  const [usageQuantity, setUsageQuantity] = useState('');
  const [usageType, setUsageType] = useState<SupplyUsageType>('ADJUSTMENT');
  const [usageLotNumber, setUsageLotNumber] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [usageFormError, setUsageFormError] = useState<string | null>(null);

  // Inventory check form state
  const [showInventoryCheckForm, setShowInventoryCheckForm] = useState(false);
  const [inventoryCheckSupply, setInventoryCheckSupply] = useState<SupplyWithRelations | null>(null);
  const [inventoryCheckQuantity, setInventoryCheckQuantity] = useState('');
  const [inventoryCheckNotes, setInventoryCheckNotes] = useState('');
  const [inventoryCheckFormError, setInventoryCheckFormError] = useState<string | null>(null);

  // Selected supply for usage tab
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('');

  // Purchase filters
  const [purchaseFilterSupplyId, setPurchaseFilterSupplyId] = useState<string>('');
  const [purchaseFilterCategoryId, setPurchaseFilterCategoryId] = useState<string>('');
  const [purchaseFilterSupplier, setPurchaseFilterSupplier] = useState<string>('');

  // All purchases data with filters
  const { data: allPurchases } = useAllSupplyPurchases(currentFarmId, {
    supplyId: purchaseFilterSupplyId || undefined,
    categoryId: purchaseFilterCategoryId || undefined,
    supplier: purchaseFilterSupplier || undefined,
  });

  // Usage data for selected supply
  const { data: usageLogs } = useSupplyUsage(currentFarmId, selectedSupplyId || undefined);
  const createPurchase = useCreateSupplyPurchase(currentFarmId ?? '', purchaseSupplyId);
  const deletePurchase = useDeleteSupplyPurchase(currentFarmId ?? '', purchaseSupplyId || selectedSupplyId);
  const createUsage = useCreateSupplyUsage(currentFarmId ?? '', usageSupplyId);
  const inventoryCheck = useInventoryCheck(currentFarmId ?? '', inventoryCheckSupply?.id ?? '');
  const recalculateInventory = useRecalculateInventory(currentFarmId ?? '');

  // Saved suppliers (from localStorage)
  const [savedSuppliers, setSavedSuppliers] = useState<string[]>(() => {
    if (!currentFarmId) return [];
    const stored = localStorage.getItem(`suppliers_${currentFarmId}`);
    return stored ? JSON.parse(stored) : [];
  });

  // Save suppliers to localStorage when they change
  const addSupplier = (supplier: string) => {
    if (!supplier.trim() || !currentFarmId) return;
    const trimmed = supplier.trim();
    if (!savedSuppliers.includes(trimmed)) {
      const updated = [...savedSuppliers, trimmed].sort();
      setSavedSuppliers(updated);
      localStorage.setItem(`suppliers_${currentFarmId}`, JSON.stringify(updated));
    }
  };

  // Seed default categories if none exist
  useEffect(() => {
    if (currentFarmId && categories && categories.length === 0 && !categoriesLoading) {
      seedDefaultCategories.mutate();
    }
  }, [currentFarmId, categories, categoriesLoading]);

  // Filter supplies
  const filteredSupplies = supplies?.filter((s) => {
    if (filterCategoryId && s.categoryId !== filterCategoryId) return false;
    return true;
  });

  // Supply form handlers
  const resetSupplyForm = () => {
    setEditingSupply(null);
    setSupplyName('');
    setSupplyCategoryId('');
    setSupplyProductId('');
    setSupplyPackageTypeId('');
    setSupplyFormError(null);
    setShowNewCategoryForm(false);
    setNewCategoryName('');
  };

  const handleOpenSupplyForm = (supply?: SupplyWithRelations) => {
    if (supply) {
      setEditingSupply(supply);
      setSupplyName(supply.name);
      setSupplyCategoryId(supply.categoryId);
      setSupplyProductId(supply.productId ?? '');
    } else {
      resetSupplyForm();
    }
    setShowSupplyForm(true);
  };

  const handleSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupplyFormError(null);

    if (!supplyCategoryId) {
      setSupplyFormError('Category is required');
      return;
    }

    // Check if Seeds category requires a variety link
    const selectedCategory = categories?.find((c) => c.id === supplyCategoryId);
    const isSeedCategory = selectedCategory?.name?.toLowerCase() === 'seeds';
    if (isSeedCategory && !supplyProductId) {
      setSupplyFormError('Seeds must be linked to a variety');
      return;
    }

    if (!supplyName.trim()) {
      setSupplyFormError('Name is required');
      return;
    }

    const data = {
      name: supplyName.trim(),
      categoryId: supplyCategoryId,
      productId: supplyProductId || undefined,
    };

    try {
      if (editingSupply) {
        await updateSupply.mutateAsync({ id: editingSupply.id, data });
        showToast('success', 'Supply updated successfully');
      } else {
        await createSupply.mutateAsync(data);
        showToast('success', 'Supply added successfully');
      }
      setShowSupplyForm(false);
      resetSupplyForm();
    } catch (err) {
      setSupplyFormError(err instanceof Error ? err.message : 'Failed to save supply');
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supply?')) return;
    try {
      await deleteSupply.mutateAsync(id);
      showToast('success', 'Supply deleted');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete supply');
    }
  };

  // Purchase form handlers
  const resetPurchaseForm = () => {
    setPurchaseSupplyId('');
    setPurchaseQuantity('');
    setPurchaseUnit('');
    setPurchaseTotalCost('');
    setPurchaseSupplier('');
    setPurchaseLotNumber('');
    setPurchaseNotes('');
    setPurchaseFormError(null);
    setNewSupplierName('');
    setShowNewSupplierInput(false);
  };

  const handleOpenPurchaseForm = (supplyId?: string) => {
    resetPurchaseForm();
    if (supplyId) {
      setPurchaseSupplyId(supplyId);
    }
    setShowPurchaseForm(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseFormError(null);

    if (!purchaseSupplyId) {
      setPurchaseFormError('Supply is required');
      return;
    }
    if (!purchaseQuantity || Number(purchaseQuantity) <= 0) {
      setPurchaseFormError('Quantity must be greater than 0');
      return;
    }
    if (!purchaseUnit.trim()) {
      setPurchaseFormError('Unit is required');
      return;
    }
    if (!purchaseTotalCost || Number(purchaseTotalCost) < 0) {
      setPurchaseFormError('Total cost is required');
      return;
    }

    // Determine supplier (either selected or new)
    const supplierName = showNewSupplierInput ? newSupplierName.trim() : purchaseSupplier;

    // Calculate unit cost from total cost
    const totalCostCents = Math.round(Number(purchaseTotalCost) * 100);
    const quantity = Number(purchaseQuantity);
    const unitCostCents = Math.round(totalCostCents / quantity);

    const data = {
      quantity,
      unit: purchaseUnit.trim(),
      unitCost: unitCostCents,
      supplier: supplierName || undefined,
      lotNumber: purchaseLotNumber || undefined,
      notes: purchaseNotes || undefined,
    };

    try {
      await createPurchase.mutateAsync(data);
      // Save new supplier if one was added
      if (supplierName) {
        addSupplier(supplierName);
      }
      setShowPurchaseForm(false);
      resetPurchaseForm();
      showToast('success', 'Stock received successfully');
    } catch (err) {
      setPurchaseFormError(err instanceof Error ? err.message : 'Failed to record purchase');
    }
  };

  // Usage form handlers
  const resetUsageForm = () => {
    setUsageSupplyId('');
    setUsageQuantity('');
    setUsageType('ADJUSTMENT');
    setUsageLotNumber('');
    setUsageNotes('');
    setUsageFormError(null);
  };

  const handleOpenUsageForm = (supplyId?: string) => {
    resetUsageForm();
    if (supplyId) {
      setUsageSupplyId(supplyId);
    }
    setShowUsageForm(true);
  };

  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsageFormError(null);

    if (!usageSupplyId) {
      setUsageFormError('Supply is required');
      return;
    }
    if (!usageQuantity || Number(usageQuantity) <= 0) {
      setUsageFormError('Quantity must be greater than 0');
      return;
    }

    const data = {
      quantity: Number(usageQuantity),
      usageType: usageType,
      lotNumber: usageLotNumber || undefined,
      notes: usageNotes || undefined,
    };

    try {
      await createUsage.mutateAsync(data);
      setShowUsageForm(false);
      resetUsageForm();
    } catch (err) {
      setUsageFormError(err instanceof Error ? err.message : 'Failed to record usage');
    }
  };

  // Inventory check form handlers
  const resetInventoryCheckForm = () => {
    setInventoryCheckSupply(null);
    setInventoryCheckQuantity('');
    setInventoryCheckNotes('');
    setInventoryCheckFormError(null);
  };

  const handleOpenInventoryCheck = (supply: SupplyWithRelations) => {
    resetInventoryCheckForm();
    setInventoryCheckSupply(supply);
    setInventoryCheckQuantity(String(supply.currentStock ?? 0));
    setShowInventoryCheckForm(true);
  };

  const handleInventoryCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInventoryCheckFormError(null);

    if (!inventoryCheckSupply) {
      setInventoryCheckFormError('No supply selected');
      return;
    }

    const actualQuantity = Number(inventoryCheckQuantity);
    if (isNaN(actualQuantity) || actualQuantity < 0) {
      setInventoryCheckFormError('Please enter a valid quantity (0 or greater)');
      return;
    }

    try {
      await inventoryCheck.mutateAsync({
        actualQuantity,
        notes: inventoryCheckNotes || undefined,
      });
      setShowInventoryCheckForm(false);
      resetInventoryCheckForm();
    } catch (err) {
      setInventoryCheckFormError(err instanceof Error ? err.message : 'Failed to update inventory');
    }
  };

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm to manage supplies.</p>
        </div>
      </div>
    );
  }

  const isLoading = categoriesLoading || suppliesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supplies & Inventory</h1>
          <p className="text-muted-foreground">Manage inventory of seeds, grow media, and other supplies</p>
        </div>
        <button
          onClick={() => handleOpenSupplyForm()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          data-tutorial="add-supply"
        >
          + Add Supply
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'stock' as TabType, label: 'Inventory' },
            { id: 'inventory' as TabType, label: 'Supply List' },
            { id: 'purchases' as TabType, label: 'Purchasing & Receiving' },
            { id: 'usage' as TabType, label: 'Usage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Stock/Inventory Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{supplies?.length ?? 0}</p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-sm text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {supplies?.filter(s => Number(s.currentStock ?? 0) > 0).length ?? 0}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {supplies?.filter(s => Number(s.currentStock ?? 0) === 0).length ?? 0}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-sm text-muted-foreground">Negative Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {supplies?.filter(s => Number(s.currentStock ?? 0) < 0).length ?? 0}
                  </p>
                </div>
              </div>

              {/* Fix negative inventory warning */}
              {(supplies?.filter(s => Number(s.currentStock ?? 0) < 0).length ?? 0) > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Some supplies have negative stock values
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      This can happen if purchases were recorded before inventory tracking was enabled. Recalculate to fix.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Recalculate inventory for all supplies? This will fix stock levels based on actual purchase and usage records.')) {
                        recalculateInventory.mutate();
                      }
                    }}
                    disabled={recalculateInventory.isPending}
                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {recalculateInventory.isPending ? 'Fixing...' : 'Fix Inventory'}
                  </button>
                </div>
              )}

              {/* Filter */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="sr-only">Category</label>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock Table */}
              {!filteredSupplies?.length ? (
                <div className="text-center py-12 border rounded-lg">
                  <p className="text-muted-foreground mb-4">No supplies found</p>
                  <button
                    onClick={() => handleOpenSupplyForm()}
                    className="text-primary hover:underline"
                  >
                    Add your first supply
                  </button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Supply</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Category</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Current Stock</th>
                        <th className="text-center px-4 py-3 text-sm font-medium">Status</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredSupplies
                        .sort((a, b) => {
                          // Sort by stock status: negative first, then zero, then positive
                          const stockA = Number(a.currentStock ?? 0);
                          const stockB = Number(b.currentStock ?? 0);
                          if (stockA < 0 && stockB >= 0) return -1;
                          if (stockA >= 0 && stockB < 0) return 1;
                          if (stockA === 0 && stockB > 0) return -1;
                          if (stockA > 0 && stockB === 0) return 1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((supply) => {
                          const currentStock = Number(supply.currentStock ?? 0);
                          const isNegative = currentStock < 0;
                          const isZero = currentStock === 0;

                          return (
                            <tr key={supply.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="font-medium">{supply.name}</div>
                                {supply.product && (
                                  <div className="text-xs text-muted-foreground">
                                    {supply.product.name}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {supply.category.name}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-lg font-semibold ${
                                  isNegative ? 'text-red-600' : isZero ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {currentStock.toLocaleString()}
                                </span>
                                {supply.unit && (
                                  <span className="ml-1 text-sm text-muted-foreground">{supply.unit}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isNegative ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Negative
                                  </span>
                                ) : isZero ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Out of Stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    In Stock
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenPurchaseForm(supply.id)}
                                    className="text-sm text-primary hover:underline"
                                  >
                                    + Stock
                                  </button>
                                  <button
                                    onClick={() => handleOpenInventoryCheck(supply)}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                  >
                                    Update
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Supply List Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="sr-only">Category</label>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat._count.supplies})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Supplies Table */}
              {!filteredSupplies?.length ? (
                <div className="text-center py-12 border rounded-lg">
                  <p className="text-muted-foreground mb-4">No supplies found</p>
                  <button
                    onClick={() => handleOpenSupplyForm()}
                    className="text-primary hover:underline"
                  >
                    Add your first supply
                  </button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Supply Name</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Category</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">In Stock</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Supplier</th>
                        <th className="text-center px-4 py-3 text-sm font-medium">Purchases</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredSupplies.map((supply) => {
                        // Find most recent purchase supplier for this supply
                        const supplyPurchases = allPurchases?.filter(p => p.supply.id === supply.id) || [];
                        const lastSupplier = supplyPurchases.length > 0 ? supplyPurchases[0]?.supplier : null;
                        const currentStock = Number(supply.currentStock ?? 0);
                        const isLowStock = currentStock < 0;

                        return (
                          <tr key={supply.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium">{supply.name}</div>
                                {supply.product && (
                                  <div className="text-xs text-muted-foreground">
                                    Linked to: {supply.product.name}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {supply.category.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={isLowStock ? 'text-red-600 font-medium' : ''}>
                                {currentStock.toLocaleString()} {supply.unit || ''}
                              </span>
                              {isLowStock && (
                                <span className="ml-1 text-xs text-red-500">!</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {lastSupplier || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {supply._count?.purchases ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenPurchaseForm(supply.id)}
                                  className="text-sm text-primary hover:underline"
                                >
                                  + Stock
                                </button>
                                <button
                                  onClick={() => handleOpenInventoryCheck(supply)}
                                  className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                  Update
                                </button>
                                <button
                                  onClick={() => handleOpenSupplyForm(supply)}
                                  className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSupply(supply.id)}
                                  className="text-sm text-destructive hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              {/* Filters and Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="sr-only">Filter by Category</label>
                  <select
                    value={purchaseFilterCategoryId}
                    onChange={(e) => {
                      setPurchaseFilterCategoryId(e.target.value);
                      // Reset supply filter when category changes
                      setPurchaseFilterSupplyId('');
                    }}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="sr-only">Filter by Supply</label>
                  <select
                    value={purchaseFilterSupplyId}
                    onChange={(e) => setPurchaseFilterSupplyId(e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Supplies</option>
                    {supplies
                      ?.filter(s => !purchaseFilterCategoryId || s.categoryId === purchaseFilterCategoryId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="sr-only">Filter by Supplier</label>
                  <select
                    value={purchaseFilterSupplier}
                    onChange={(e) => setPurchaseFilterSupplier(e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Suppliers</option>
                    {savedSuppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </div>
                {(purchaseFilterCategoryId || purchaseFilterSupplyId || purchaseFilterSupplier) && (
                  <button
                    onClick={() => {
                      setPurchaseFilterCategoryId('');
                      setPurchaseFilterSupplyId('');
                      setPurchaseFilterSupplier('');
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => handleOpenPurchaseForm()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  data-tutorial="receive-supply"
                >
                  + Receive Stock
                </button>
              </div>

              {/* Purchases Table */}
              {!allPurchases?.length ? (
                <div className="text-center py-12 border rounded-lg text-muted-foreground">
                  {purchaseFilterCategoryId || purchaseFilterSupplyId || purchaseFilterSupplier
                    ? 'No purchases match the selected filters'
                    : 'No purchase records found. Add stock using the "Receive Stock" button.'}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Supply</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Category</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Quantity</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Cost</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Supplier</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Lot #</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">
                            {new Date(purchase.purchaseDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {purchase.supply.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {purchase.supply.category.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {Number(purchase.quantity).toLocaleString()} {purchase.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(purchase.totalCost)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {purchase.supplier || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {purchase.lotNumber || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (confirm('Delete this purchase record?')) {
                                  // Set the supply ID for the delete mutation
                                  setPurchaseSupplyId(purchase.supply.id);
                                  setTimeout(() => deletePurchase.mutate(purchase.id), 0);
                                }
                              }}
                              className="text-sm text-destructive hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="sr-only">Select Supply</label>
                  <select
                    value={selectedSupplyId}
                    onChange={(e) => setSelectedSupplyId(e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a supply...</option>
                    {supplies?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category.name})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleOpenUsageForm()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  + Record Usage
                </button>
              </div>

              {!selectedSupplyId ? (
                <div className="text-center py-12 border rounded-lg text-muted-foreground">
                  Select a supply to view usage history
                </div>
              ) : !usageLogs?.length ? (
                <div className="text-center py-12 border rounded-lg text-muted-foreground">
                  No usage records found
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Quantity</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Type</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Lot #</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {usageLogs.map((usage) => (
                        <tr key={usage.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">
                            {new Date(usage.usageDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {Number(usage.quantity).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                usage.usageType === 'PRODUCTION'
                                  ? 'bg-blue-100 text-blue-800'
                                  : usage.usageType === 'WASTE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {usage.usageType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {usage.lotNumber || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {usage.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Supply Form Modal */}
      {showSupplyForm && (() => {
        // Get the selected category name
        const selectedCategory = categories?.find((c) => c.id === supplyCategoryId);
        const isSeedsCategory = selectedCategory?.name?.toLowerCase() === 'seeds';
        const isPackagingCategory = selectedCategory?.name?.toLowerCase() === 'packaging';
        const activePackageTypes = packageTypes?.filter((pt) => pt.isActive) || [];

        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingSupply ? 'Edit Supply' : 'Add Supply'}
              </h2>

              <form onSubmit={handleSupplySubmit} className="space-y-4">
                {/* Category - FIRST and Required */}
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  {!showNewCategoryForm ? (
                    <div className="flex gap-2">
                      <select
                        value={supplyCategoryId}
                        onChange={(e) => {
                          setSupplyCategoryId(e.target.value);
                          // Reset links when changing category
                          const newCat = categories?.find((c) => c.id === e.target.value);
                          if (newCat?.name?.toLowerCase() !== 'seeds') {
                            setSupplyProductId('');
                          }
                          if (newCat?.name?.toLowerCase() !== 'packaging') {
                            setSupplyPackageTypeId('');
                          }
                          // Reset name when changing category
                          setSupplyName('');
                        }}
                        className="flex-1 rounded-md border bg-background px-3 py-2"
                      >
                        <option value="">Select a category...</option>
                        {categories?.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryForm(true);
                          setSupplyCategoryId('');
                        }}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-accent whitespace-nowrap"
                      >
                        + New
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">New Category Name</label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="e.g., Cleaning Supplies"
                          className="w-full rounded-md border bg-background px-3 py-2"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryForm(false);
                            setNewCategoryName('');
                          }}
                          className="flex-1 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newCategoryName.trim()) {
                              setSupplyFormError('Category name is required');
                              return;
                            }
                            try {
                              const newCategory = await createSupplyCategory.mutateAsync({
                                name: newCategoryName.trim(),
                              });
                              setSupplyCategoryId(newCategory.id);
                              setShowNewCategoryForm(false);
                              setNewCategoryName('');
                              setSupplyFormError(null);
                            } catch (err) {
                              setSupplyFormError(err instanceof Error ? err.message : 'Failed to create category');
                            }
                          }}
                          disabled={createSupplyCategory.isPending}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                          {createSupplyCategory.isPending ? 'Creating...' : 'Create Category'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Show rest of form only after category is selected */}
                {supplyCategoryId && (
                  <>
                    {/* For Seeds: Variety Link (Required) */}
                    {isSeedsCategory && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Linked Variety *</label>
                        <select
                          value={supplyProductId}
                          onChange={(e) => {
                            setSupplyProductId(e.target.value);
                            // Auto-set name based on variety
                            const variety = products?.find((p) => p.id === e.target.value);
                            if (variety) {
                              setSupplyName(`${variety.name} Seeds`);
                            }
                          }}
                          className="w-full rounded-md border bg-background px-3 py-2"
                        >
                          <option value="">Select a variety...</option>
                          {products
                            ?.filter((p) => !p.isBlend)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Seeds must be linked to a variety for production tracking
                        </p>
                      </div>
                    )}

                    {/* For Packaging: Package Type Dropdown */}
                    {isPackagingCategory && activePackageTypes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Package Type</label>
                        <select
                          value={supplyPackageTypeId}
                          onChange={(e) => {
                            setSupplyPackageTypeId(e.target.value);
                            // Auto-set name based on package type
                            const pkgType = packageTypes?.find((pt) => pt.id === e.target.value);
                            if (pkgType) {
                              setSupplyName(`${pkgType.name} (${pkgType.code})`);
                            }
                          }}
                          className="w-full rounded-md border bg-background px-3 py-2"
                        >
                          <option value="">Select a package type...</option>
                          {activePackageTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} ({pt.code})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Package types are managed in the Planning tab
                        </p>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        value={supplyName}
                        onChange={(e) => setSupplyName(e.target.value)}
                        placeholder={
                          isSeedsCategory
                            ? 'e.g., Sunflower Seeds'
                            : isPackagingCategory
                              ? 'e.g., 4oz Clamshell'
                              : selectedCategory?.name?.toLowerCase() === 'grow media'
                                ? 'e.g., BioStrate 10x20'
                                : `e.g., ${selectedCategory?.name || 'Supply'} item name`
                        }
                        className="w-full rounded-md border bg-background px-3 py-2"
                      />
                    </div>
                  </>
                )}

                {supplyFormError && (
                  <div className="text-sm text-destructive">{supplyFormError}</div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupplyForm(false);
                      resetSupplyForm();
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSupply.isPending || updateSupply.isPending || !supplyCategoryId}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {editingSupply ? 'Save Changes' : 'Add Supply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Purchase Form Modal */}
      {showPurchaseForm && (() => {
        // Get the selected supply's category for unit options
        const selectedSupply = supplies?.find(s => s.id === purchaseSupplyId);
        const selectedCategoryName = selectedSupply?.category?.name?.toLowerCase() || '';

        // Define unit options based on category
        const getUnitOptions = () => {
          if (selectedCategoryName === 'seeds') {
            return [
              { value: 'g', label: 'Grams (g)' },
              { value: 'oz', label: 'Ounces (oz)' },
              { value: 'lb', label: 'Pounds (lb)' },
              { value: 'kg', label: 'Kilograms (kg)' },
            ];
          } else if (selectedCategoryName === 'grow media') {
            return [
              { value: 'lb', label: 'Pounds (lb)' },
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'sheets', label: 'Sheets' },
            ];
          } else if (selectedCategoryName === 'packaging') {
            return [
              { value: 'units', label: 'Units' },
              { value: 'cases', label: 'Cases' },
              { value: 'boxes', label: 'Boxes' },
            ];
          } else {
            // Default/Other/Custom categories - comprehensive list
            return [
              { value: 'units', label: 'Units' },
              { value: 'bottles', label: 'Bottles' },
              { value: 'gallons', label: 'Gallons' },
              { value: 'liters', label: 'Liters' },
              { value: 'oz', label: 'Ounces (oz)' },
              { value: 'lb', label: 'Pounds (lb)' },
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'cases', label: 'Cases' },
              { value: 'boxes', label: 'Boxes' },
              { value: 'bags', label: 'Bags' },
              { value: 'rolls', label: 'Rolls' },
            ];
          }
        };

        const unitOptions = getUnitOptions();

        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Receive Stock</h2>

              <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supply *</label>
                  <select
                    value={purchaseSupplyId}
                    onChange={(e) => {
                      setPurchaseSupplyId(e.target.value);
                      // Reset unit when supply changes (category may differ)
                      setPurchaseUnit('');
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  >
                    <option value="">Select a supply...</option>
                    {supplies?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={purchaseQuantity}
                      onChange={(e) => setPurchaseQuantity(e.target.value)}
                      placeholder="Amount"
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit *</label>
                    <select
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2"
                      disabled={!purchaseSupplyId}
                    >
                      <option value="">Select unit...</option>
                      {unitOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseTotalCost}
                    onChange={(e) => setPurchaseTotalCost(e.target.value)}
                    placeholder="Total amount paid"
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                  {purchaseQuantity && purchaseTotalCost && Number(purchaseQuantity) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(Math.round((Number(purchaseTotalCost) * 100) / Number(purchaseQuantity)))} per {purchaseUnit || 'unit'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  {!showNewSupplierInput ? (
                    <div className="flex gap-2">
                      <select
                        value={purchaseSupplier}
                        onChange={(e) => setPurchaseSupplier(e.target.value)}
                        className="flex-1 rounded-md border bg-background px-3 py-2"
                      >
                        <option value="">Select supplier...</option>
                        {savedSuppliers.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewSupplierInput(true)}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-accent"
                      >
                        + New
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        placeholder="New supplier name"
                        className="flex-1 rounded-md border bg-background px-3 py-2"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewSupplierInput(false);
                          setNewSupplierName('');
                        }}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Lot Number</label>
                  <input
                    type="text"
                    value={purchaseLotNumber}
                    onChange={(e) => setPurchaseLotNumber(e.target.value)}
                    placeholder="Batch/lot number"
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                {purchaseFormError && (
                  <div className="text-sm text-destructive">{purchaseFormError}</div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPurchaseForm(false);
                      resetPurchaseForm();
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPurchase.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    Receive Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Usage Form Modal */}
      {showUsageForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Record Usage</h2>

              <form onSubmit={handleUsageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supply *</label>
                  <select
                    value={usageSupplyId}
                    onChange={(e) => setUsageSupplyId(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  >
                    <option value="">Select a supply...</option>
                    {supplies?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={usageQuantity}
                      onChange={(e) => setUsageQuantity(e.target.value)}
                      placeholder="Amount used"
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      value={usageType}
                      onChange={(e) => setUsageType(e.target.value as SupplyUsageType)}
                      className="w-full rounded-md border bg-background px-3 py-2"
                    >
                      <option value="PRODUCTION">Production</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                      <option value="WASTE">Waste</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Lot Number</label>
                  <input
                    type="text"
                    value={usageLotNumber}
                    onChange={(e) => setUsageLotNumber(e.target.value)}
                    placeholder="Which lot was used"
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={usageNotes}
                    onChange={(e) => setUsageNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                {usageFormError && (
                  <div className="text-sm text-destructive">{usageFormError}</div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUsageForm(false);
                      resetUsageForm();
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createUsage.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    Record Usage
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Check Modal */}
      {showInventoryCheckForm && inventoryCheckSupply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Update Inventory</h2>

              <form onSubmit={handleInventoryCheckSubmit} className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="font-medium">{inventoryCheckSupply.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Current Stock: {Number(inventoryCheckSupply.currentStock ?? 0).toLocaleString()} {inventoryCheckSupply.unit || 'units'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Actual Count {inventoryCheckSupply.unit ? `(${inventoryCheckSupply.unit})` : ''} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inventoryCheckQuantity}
                    onChange={(e) => setInventoryCheckQuantity(e.target.value)}
                    placeholder="Enter actual quantity on hand"
                    className="w-full rounded-md border bg-background px-3 py-2"
                    autoFocus
                  />
                  {inventoryCheckQuantity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(() => {
                        const current = Number(inventoryCheckSupply.currentStock ?? 0);
                        const actual = Number(inventoryCheckQuantity);
                        const diff = actual - current;
                        if (diff === 0) return 'No change';
                        return `Adjustment: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} ${inventoryCheckSupply.unit || 'units'}`;
                      })()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={inventoryCheckNotes}
                    onChange={(e) => setInventoryCheckNotes(e.target.value)}
                    placeholder="Reason for adjustment (optional)"
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  The difference will be recorded as an inventory adjustment for audit trail.
                </p>

                {inventoryCheckFormError && (
                  <div className="text-sm text-destructive">{inventoryCheckFormError}</div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInventoryCheckForm(false);
                      resetInventoryCheckForm();
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inventoryCheck.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {inventoryCheck.isPending ? 'Updating...' : 'Update Inventory'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
