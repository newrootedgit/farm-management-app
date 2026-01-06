import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { CsaShareType, CsaWeekWithRelations, SetWeekAllocation } from '@farm/shared';

interface Product {
  id: string;
  name: string;
}

interface WeekAllocationGridProps {
  week: CsaWeekWithRelations;
  shareTypes: CsaShareType[];
  products: Product[];
  onSave: (allocations: SetWeekAllocation[]) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

interface AllocationRow {
  id: string;
  productId: string;
  allocations: Record<string, number>; // shareTypeId -> quantityOz
}

export function WeekAllocationGrid({
  week,
  shareTypes,
  products,
  onSave,
  isLoading = false,
  disabled = false,
}: WeekAllocationGridProps) {
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize rows from existing allocations
  useEffect(() => {
    const allocationMap = new Map<string, Record<string, number>>();

    week.allocations.forEach((alloc) => {
      if (!allocationMap.has(alloc.productId)) {
        allocationMap.set(alloc.productId, {});
      }
      allocationMap.get(alloc.productId)![alloc.shareTypeId] = alloc.quantityOz;
    });

    const initialRows: AllocationRow[] = [];
    allocationMap.forEach((allocations, productId) => {
      initialRows.push({
        id: `row-${productId}`,
        productId,
        allocations,
      });
    });

    // Sort by product name
    initialRows.sort((a, b) => {
      const productA = products.find((p) => p.id === a.productId);
      const productB = products.find((p) => p.id === b.productId);
      return (productA?.name || '').localeCompare(productB?.name || '');
    });

    setRows(initialRows);
    setHasChanges(false);
  }, [week, products]);

  const addRow = () => {
    // Find a product not already in the grid
    const usedProductIds = new Set(rows.map((r) => r.productId));
    const availableProduct = products.find((p) => !usedProductIds.has(p.id));

    if (!availableProduct) {
      alert('All products have been added');
      return;
    }

    setRows([
      ...rows,
      {
        id: `row-${Date.now()}`,
        productId: availableProduct.id,
        allocations: {},
      },
    ]);
    setHasChanges(true);
  };

  const removeRow = (rowId: string) => {
    setRows(rows.filter((r) => r.id !== rowId));
    setHasChanges(true);
  };

  const updateProductId = (rowId: string, productId: string) => {
    setRows(
      rows.map((r) =>
        r.id === rowId ? { ...r, productId } : r
      )
    );
    setHasChanges(true);
  };

  const updateAllocation = (rowId: string, shareTypeId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRows(
      rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              allocations: {
                ...r.allocations,
                [shareTypeId]: numValue,
              },
            }
          : r
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Convert rows to allocations array
    const allocations: SetWeekAllocation[] = [];

    rows.forEach((row) => {
      shareTypes.forEach((shareType) => {
        const qty = row.allocations[shareType.id];
        if (qty && qty > 0) {
          allocations.push({
            shareTypeId: shareType.id,
            productId: row.productId,
            quantityOz: qty,
          });
        }
      });
    });

    await onSave(allocations);
    setHasChanges(false);
  };

  const usedProductIds = new Set(rows.map((r) => r.productId));

  // Calculate totals per share type
  const totals: Record<string, number> = {};
  shareTypes.forEach((st) => {
    totals[st.id] = rows.reduce((sum, row) => sum + (row.allocations[st.id] || 0), 0);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          Week {week.weekNumber} Allocations
        </h3>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading || disabled}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">
                Product
              </th>
              {shareTypes.map((st) => (
                <th
                  key={st.id}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[100px]"
                >
                  {st.name}
                  <div className="text-[10px] font-normal text-gray-400">oz per share</div>
                </th>
              ))}
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={shareTypes.length + 2}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No products allocated yet. Click "Add Product" to start.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2">
                    <select
                      value={row.productId}
                      onChange={(e) => updateProductId(row.id, e.target.value)}
                      disabled={disabled}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-green-500 focus:border-green-500"
                    >
                      {products
                        .filter((p) => p.id === row.productId || !usedProductIds.has(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  {shareTypes.map((st) => (
                    <td key={st.id} className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.allocations[st.id] || ''}
                        onChange={(e) => updateAllocation(row.id, st.id, e.target.value)}
                        disabled={disabled}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-green-500 focus:border-green-500"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={disabled}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">
                  Total per share
                </td>
                {shareTypes.map((st) => (
                  <td
                    key={st.id}
                    className="px-4 py-2 text-sm font-medium text-center text-gray-900"
                  >
                    {totals[st.id].toFixed(1)} oz
                  </td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <button
        onClick={addRow}
        disabled={disabled || products.length === rows.length}
        className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlusIcon className="h-4 w-4" />
        Add Product
      </button>
    </div>
  );
}
