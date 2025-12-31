import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useSkus,
  useCreateSku,
  useUpdateSku,
  useDeleteSku,
} from '@/lib/api-client';
import type { Product, Sku, CreateSku, UpdateSku } from '@farm/shared';
import { formatPrice, centsToDollars, dollarsToCents } from '@farm/shared';

interface ProductFormData {
  name: string;
  seedWeight: string;
  requiresSoaking: boolean;
  daysSoaking: string;
  daysGermination: string;
  daysLight: string;
  avgYieldPerTray: string;
}

interface SkuFormData {
  skuCode: string;
  name: string;
  weightOz: string;
  price: string;
  isAvailable: boolean;
  isPublic: boolean;
  stockQuantity: string;
  lowStockThreshold: string;
  displayOrder: string;
}

const emptyProductForm: ProductFormData = {
  name: '',
  seedWeight: '',
  requiresSoaking: false,
  daysSoaking: '1',
  daysGermination: '',
  daysLight: '',
  avgYieldPerTray: '',
};

const emptySkuForm: SkuFormData = {
  skuCode: '',
  name: '',
  weightOz: '',
  price: '',
  isAvailable: true,
  isPublic: true,
  stockQuantity: '',
  lowStockThreshold: '',
  displayOrder: '0',
};

export default function InventoryPage() {
  const { currentFarmId } = useFarmStore();
  const { data: products, isLoading } = useProducts(currentFarmId ?? undefined);
  const createProduct = useCreateProduct(currentFarmId ?? '');
  const updateProduct = useUpdateProduct(currentFarmId ?? '');
  const deleteProduct = useDeleteProduct(currentFarmId ?? '');

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<ProductFormData>(emptyProductForm);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  // SKU state
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showSkuForm, setShowSkuForm] = useState(false);
  const [editingSku, setEditingSku] = useState<Sku | null>(null);
  const [skuFormData, setSkuFormData] = useState<SkuFormData>(emptySkuForm);
  const [skuFormError, setSkuFormError] = useState<string | null>(null);

  // SKU hooks for expanded product
  const { data: skus, isLoading: skusLoading } = useSkus(
    currentFarmId ?? '',
    expandedProductId ?? ''
  );
  const createSku = useCreateSku(currentFarmId ?? '', expandedProductId ?? '');
  const updateSku = useUpdateSku(currentFarmId ?? '', expandedProductId ?? '');
  const deleteSku = useDeleteSku(currentFarmId ?? '', expandedProductId ?? '');

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm to manage varieties.</p>
        </div>
      </div>
    );
  }

  // Product form handlers
  const handleOpenProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      const hasSoaking = product.daysSoaking != null && product.daysSoaking > 0;
      setProductFormData({
        name: product.name,
        seedWeight: product.seedWeight?.toString() ?? '',
        requiresSoaking: hasSoaking,
        daysSoaking: hasSoaking ? product.daysSoaking!.toString() : '1',
        daysGermination: product.daysGermination?.toString() ?? '',
        daysLight: product.daysLight?.toString() ?? '',
        avgYieldPerTray: product.avgYieldPerTray?.toString() ?? '',
      });
    } else {
      setEditingProduct(null);
      setProductFormData(emptyProductForm);
    }
    setProductFormError(null);
    setShowProductForm(true);
  };

  const handleCloseProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductFormData(emptyProductForm);
    setProductFormError(null);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    if (!productFormData.name.trim()) {
      setProductFormError('Variety name is required');
      return;
    }

    const data = {
      name: productFormData.name.trim(),
      seedUnit: 'grams' as const,
      seedWeight: productFormData.seedWeight ? parseFloat(productFormData.seedWeight) : undefined,
      daysSoaking:
        productFormData.requiresSoaking && productFormData.daysSoaking
          ? parseInt(productFormData.daysSoaking)
          : undefined,
      daysGermination: productFormData.daysGermination
        ? parseInt(productFormData.daysGermination)
        : undefined,
      daysLight: productFormData.daysLight ? parseInt(productFormData.daysLight) : undefined,
      avgYieldPerTray: productFormData.avgYieldPerTray
        ? parseFloat(productFormData.avgYieldPerTray)
        : undefined,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ productId: editingProduct.id, data });
      } else {
        await createProduct.mutateAsync(data);
      }
      handleCloseProductForm();
    } catch (err) {
      setProductFormError(err instanceof Error ? err.message : 'Failed to save variety');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this variety? All associated SKUs will also be deleted.'))
      return;
    try {
      await deleteProduct.mutateAsync(productId);
      if (expandedProductId === productId) {
        setExpandedProductId(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete variety');
    }
  };

  // SKU form handlers
  const handleOpenSkuForm = (productId: string, sku?: Sku) => {
    if (sku) {
      setEditingSku(sku);
      setSkuFormData({
        skuCode: sku.skuCode,
        name: sku.name,
        weightOz: sku.weightOz.toString(),
        price: centsToDollars(sku.price).toString(),
        isAvailable: sku.isAvailable,
        isPublic: sku.isPublic,
        stockQuantity: sku.stockQuantity?.toString() ?? '',
        lowStockThreshold: sku.lowStockThreshold?.toString() ?? '',
        displayOrder: sku.displayOrder.toString(),
      });
    } else {
      setEditingSku(null);
      // Auto-generate SKU code based on product name
      const product = products?.find((p) => p.id === productId);
      const prefix = product?.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) ?? 'SKU';
      setSkuFormData({
        ...emptySkuForm,
        skuCode: `${prefix}-`,
        name: product?.name ? `${product.name} ` : '',
      });
    }
    setSkuFormError(null);
    setShowSkuForm(true);
  };

  const handleCloseSkuForm = () => {
    setShowSkuForm(false);
    setEditingSku(null);
    setSkuFormData(emptySkuForm);
    setSkuFormError(null);
  };

  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSkuFormError(null);

    if (!skuFormData.skuCode.trim()) {
      setSkuFormError('SKU code is required');
      return;
    }
    if (!skuFormData.name.trim()) {
      setSkuFormError('Name is required');
      return;
    }
    if (!skuFormData.weightOz || parseFloat(skuFormData.weightOz) <= 0) {
      setSkuFormError('Weight must be greater than 0');
      return;
    }
    if (!skuFormData.price || parseFloat(skuFormData.price) < 0) {
      setSkuFormError('Price must be a valid amount');
      return;
    }

    const data: CreateSku | UpdateSku = {
      skuCode: skuFormData.skuCode.trim(),
      name: skuFormData.name.trim(),
      weightOz: parseFloat(skuFormData.weightOz),
      price: dollarsToCents(parseFloat(skuFormData.price)),
      isAvailable: skuFormData.isAvailable,
      isPublic: skuFormData.isPublic,
      stockQuantity: skuFormData.stockQuantity ? parseInt(skuFormData.stockQuantity) : undefined,
      lowStockThreshold: skuFormData.lowStockThreshold
        ? parseInt(skuFormData.lowStockThreshold)
        : undefined,
      displayOrder: parseInt(skuFormData.displayOrder) || 0,
    };

    try {
      if (editingSku) {
        await updateSku.mutateAsync({ skuId: editingSku.id, data });
      } else {
        await createSku.mutateAsync(data as CreateSku);
      }
      handleCloseSkuForm();
    } catch (err) {
      setSkuFormError(err instanceof Error ? err.message : 'Failed to save SKU');
    }
  };

  const handleDeleteSku = async (skuId: string) => {
    if (!confirm('Are you sure you want to delete this SKU?')) return;
    try {
      await deleteSku.mutateAsync(skuId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete SKU');
    }
  };

  const toggleExpandProduct = (productId: string) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  const getTotalGrowthDays = (p: Product) => {
    const soak = p.daysSoaking ?? 0;
    const germ = p.daysGermination ?? 0;
    const light = p.daysLight ?? 0;
    return soak + germ + light;
  };

  const isReady = (p: Product) => {
    return p.daysGermination != null && p.daysLight != null && p.avgYieldPerTray != null;
  };

  const avgYield = products?.length
    ? (products.reduce((sum, p) => sum + (p.avgYieldPerTray ?? 0), 0) / products.length).toFixed(1)
    : '0';

  const avgGrowthDays = products?.length
    ? Math.round(products.reduce((sum, p) => sum + getTotalGrowthDays(p), 0) / products.length)
    : 0;

  const readyCount = products?.filter(isReady).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Microgreen Varieties</h1>
          <p className="text-muted-foreground">Manage variety data, production parameters, and SKUs</p>
        </div>
        <button
          onClick={() => handleOpenProductForm()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add Variety
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Varieties</p>
          <p className="text-2xl font-bold">{products?.length ?? 0}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Avg Yield/Tray</p>
          <p className="text-2xl font-bold">{avgYield} oz</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Avg Growth Days</p>
          <p className="text-2xl font-bold">{avgGrowthDays}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Ready to Use</p>
          <p className="text-2xl font-bold">{readyCount}</p>
        </div>
      </div>

      {/* Varieties Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading varieties...</div>
      ) : products?.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <h3 className="text-lg font-semibold">No varieties yet</h3>
          <p className="text-muted-foreground mb-4">Add your first microgreen variety to get started.</p>
          <button
            onClick={() => handleOpenProductForm()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Variety
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Variety Name</th>
                <th className="px-4 py-3 font-medium text-center">Seed (g/tray)</th>
                <th className="px-4 py-3 font-medium text-center">Soak</th>
                <th className="px-4 py-3 font-medium text-center">Germ</th>
                <th className="px-4 py-3 font-medium text-center">Light</th>
                <th className="px-4 py-3 font-medium text-center">Total Days</th>
                <th className="px-4 py-3 font-medium text-center">Yield (oz/tray)</th>
                <th className="px-4 py-3 font-medium text-center">SKUs</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products?.map((product) => (
                <>
                  <tr
                    key={product.id}
                    className={`hover:bg-muted/30 ${expandedProductId === product.id ? 'bg-muted/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpandProduct(product.id)}
                        className="p-1 hover:bg-muted rounded"
                        title="Show SKUs"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            expandedProductId === product.id ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {product.seedWeight ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {product.daysSoaking && product.daysSoaking > 0 ? product.daysSoaking : 'No'}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {product.daysGermination ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {product.daysLight ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {getTotalGrowthDays(product) || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {product.avgYieldPerTray ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleExpandProduct(product.id)}
                        className="text-sm text-primary hover:underline"
                      >
                        {(product as Product & { _count?: { skus?: number } })._count?.skus ?? 0}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isReady(product) ? (
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Ready
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Incomplete
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenProductForm(product)}
                        className="text-sm text-primary hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {/* Expanded SKUs row */}
                  {expandedProductId === product.id && (
                    <tr key={`${product.id}-skus`}>
                      <td colSpan={11} className="px-4 py-4 bg-muted/10">
                        <div className="ml-8">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">SKUs for {product.name}</h4>
                            <button
                              onClick={() => handleOpenSkuForm(product.id)}
                              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              Add SKU
                            </button>
                          </div>
                          {skusLoading ? (
                            <p className="text-sm text-muted-foreground">Loading SKUs...</p>
                          ) : skus?.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No SKUs defined. Add SKUs to enable ordering (e.g., 4oz, 8oz, 16oz).
                            </p>
                          ) : (
                            <div className="border rounded-lg overflow-hidden bg-background">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                  <tr className="text-left">
                                    <th className="px-3 py-2 font-medium">SKU Code</th>
                                    <th className="px-3 py-2 font-medium">Name</th>
                                    <th className="px-3 py-2 font-medium text-center">Weight</th>
                                    <th className="px-3 py-2 font-medium text-center">Price</th>
                                    <th className="px-3 py-2 font-medium text-center">Stock</th>
                                    <th className="px-3 py-2 font-medium text-center">Status</th>
                                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {skus?.map((sku) => (
                                    <tr key={sku.id} className="hover:bg-muted/20">
                                      <td className="px-3 py-2 font-mono text-xs">{sku.skuCode}</td>
                                      <td className="px-3 py-2">{sku.name}</td>
                                      <td className="px-3 py-2 text-center">{sku.weightOz} oz</td>
                                      <td className="px-3 py-2 text-center">{formatPrice(sku.price)}</td>
                                      <td className="px-3 py-2 text-center text-muted-foreground">
                                        {sku.stockQuantity != null ? sku.stockQuantity : '-'}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          {sku.isAvailable ? (
                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Available" />
                                          ) : (
                                            <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Unavailable" />
                                          )}
                                          {sku.isPublic ? (
                                            <span className="text-xs text-muted-foreground">Public</span>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Hidden</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <button
                                          onClick={() => handleOpenSkuForm(product.id, sku)}
                                          className="text-xs text-primary hover:underline mr-2"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSku(sku.id)}
                                          className="text-xs text-destructive hover:underline"
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
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Edit Variety' : 'Add Variety'}
              </h2>
              <button
                onClick={handleCloseProductForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              {productFormError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {productFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Variety Name *</label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., Sunflower, Pea Shoots"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Seed Weight (g/tray)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={productFormData.seedWeight}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, seedWeight: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Avg Yield (oz/tray)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={productFormData.avgYieldPerTray}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, avgYieldPerTray: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 8"
                  />
                </div>
              </div>

              {/* Soaking checkbox */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productFormData.requiresSoaking}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, requiresSoaking: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Soaked seed?</span>
                </label>

                {productFormData.requiresSoaking && (
                  <div className="ml-7">
                    <label className="block text-sm font-medium mb-1">Days Soaking</label>
                    <input
                      type="number"
                      min="1"
                      value={productFormData.daysSoaking}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, daysSoaking: e.target.value })
                      }
                      className="w-24 px-3 py-2 border rounded-md bg-background"
                      placeholder="1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Days Germination</label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.daysGermination}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, daysGermination: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Days Under Light</label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.daysLight}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, daysLight: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 4"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseProductForm}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProduct.isPending || updateProduct.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createProduct.isPending || updateProduct.isPending
                    ? 'Saving...'
                    : editingProduct
                    ? 'Save Changes'
                    : 'Add Variety'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit SKU Modal */}
      {showSkuForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingSku ? 'Edit SKU' : 'Add SKU'}</h2>
              <button
                onClick={handleCloseSkuForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSkuSubmit} className="p-6 space-y-4">
              {skuFormError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {skuFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={skuFormData.skuCode}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, skuCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background font-mono"
                    placeholder="e.g., ARU-4OZ"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={skuFormData.displayOrder}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, displayOrder: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={skuFormData.name}
                  onChange={(e) => setSkuFormData({ ...skuFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., 4oz Arugula"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (oz) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={skuFormData.weightOz}
                    onChange={(e) => setSkuFormData({ ...skuFormData, weightOz: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={skuFormData.price}
                    onChange={(e) => setSkuFormData({ ...skuFormData, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 5.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={skuFormData.stockQuantity}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, stockQuantity: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={skuFormData.lowStockThreshold}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, lowStockThreshold: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skuFormData.isAvailable}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, isAvailable: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Available for sale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skuFormData.isPublic}
                    onChange={(e) => setSkuFormData({ ...skuFormData, isPublic: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Show on storefront</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseSkuForm}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSku.isPending || updateSku.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createSku.isPending || updateSku.isPending
                    ? 'Saving...'
                    : editingSku
                    ? 'Save Changes'
                    : 'Add SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
