import { useState, useEffect } from 'react';
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
  useDeleteSkuDynamic,
  useBlends,
  useCreateBlend,
  useUpdateBlend,
  useDeleteBlend,
  usePackageTypes,
  useCreatePackageType,
  useUpdatePackageType,
  useDeletePackageType,
  useSeedDefaultPackageTypes,
} from '@/lib/api-client';
import type { Product, Sku, CreateSku, UpdateSku, CreateBlend, PackageType, SkuWeightUnit } from '@farm/shared';
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

type SalesChannel = 'WHOLESALE' | 'RETAIL' | 'BOTH';

interface SkuFormData {
  skuCode: string;
  name: string;
  weightOz: string;
  weightUnit: SkuWeightUnit;
  price: string;
  isAvailable: boolean;
  isPublic: boolean;
  stockQuantity: string;
  lowStockThreshold: string;
  salesChannel: SalesChannel;
  packageTypeId: string;
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
  weightUnit: 'oz',
  price: '',
  isAvailable: true,
  isPublic: true,
  stockQuantity: '',
  lowStockThreshold: '',
  salesChannel: 'BOTH',
  packageTypeId: '',
};

export default function InventoryPage() {
  const { currentFarmId } = useFarmStore();
  const { data: products, isLoading } = useProducts(currentFarmId ?? undefined);
  const createProduct = useCreateProduct(currentFarmId ?? '');
  const updateProduct = useUpdateProduct(currentFarmId ?? '');
  const deleteProduct = useDeleteProduct(currentFarmId ?? '');

  // Mixes (blends) hooks
  const { data: blends, isLoading: blendsLoading } = useBlends(currentFarmId ?? undefined);
  const createBlend = useCreateBlend(currentFarmId ?? '');
  const updateBlend = useUpdateBlend(currentFarmId ?? '');
  const deleteBlend = useDeleteBlend(currentFarmId ?? '');

  // Package types hooks
  const { data: packageTypes, isLoading: packageTypesLoading } = usePackageTypes(currentFarmId ?? undefined);
  const createPackageType = useCreatePackageType(currentFarmId ?? '');
  const updatePackageType = useUpdatePackageType(currentFarmId ?? '');
  const deletePackageType = useDeletePackageType(currentFarmId ?? '');
  const seedDefaultPackageTypes = useSeedDefaultPackageTypes(currentFarmId ?? '');

  // Tab state
  const [activeTab, setActiveTab] = useState<'varieties' | 'mixes'>('varieties');

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

  // Mix form state
  const [showMixForm, setShowMixForm] = useState(false);
  const [editingBlend, setEditingBlend] = useState<string | null>(null); // blend ID when editing
  const [mixError, setMixError] = useState<string | null>(null);
  const [mixName, setMixName] = useState('');
  const [mixDescription, setMixDescription] = useState('');
  const [mixIsActive, setMixIsActive] = useState(true);
  const [mixIngredients, setMixIngredients] = useState<{ productId: string; ratioPercent: string }[]>([
    { productId: '', ratioPercent: '' },
    { productId: '', ratioPercent: '' },
  ]);
  const [expandedMixId, setExpandedMixId] = useState<string | null>(null);

  // Get the product ID for the expanded mix (mixes have an associated product)
  const expandedMixProductId = expandedMixId
    ? blends?.find((b) => b.id === expandedMixId)?.productId
    : null;

  // SKU data for expanded mix (uses main SKU hooks via expandedProductId when editing)
  const { data: mixSkus, isLoading: mixSkusLoading } = useSkus(
    currentFarmId ?? '',
    expandedMixProductId ?? ''
  );
  const deleteSkuDynamic = useDeleteSkuDynamic(currentFarmId ?? '');

  // Package type management state
  const [showPackageTypeModal, setShowPackageTypeModal] = useState(false);
  const [editingPackageType, setEditingPackageType] = useState<PackageType | null>(null);
  const [packageTypeName, setPackageTypeName] = useState('');
  const [packageTypeCode, setPackageTypeCode] = useState('');
  const [packageTypeError, setPackageTypeError] = useState<string | null>(null);

  // Seed default package types if none exist
  useEffect(() => {
    if (currentFarmId && packageTypes && packageTypes.length === 0 && !packageTypesLoading) {
      seedDefaultPackageTypes.mutate();
    }
  }, [currentFarmId, packageTypes, packageTypesLoading]);

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

  // Helper to generate SKU code from product name, weight, unit, and package type
  const generateSkuCode = (productName: string, weightOz: string, weightUnit: SkuWeightUnit, packageTypeId: string) => {
    const prefix = productName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'SKU';

    const weight = weightOz ? `${weightOz}${weightUnit.toUpperCase()}` : '';
    const pkgType = packageTypes?.find((pt) => pt.id === packageTypeId);
    const pkgAbbrev = pkgType?.code ?? '';

    const parts = [prefix, weight, pkgAbbrev].filter(Boolean);
    return parts.join('-');
  };

  // Helper to generate SKU name from product name, weight, unit, and package type
  const generateSkuName = (productName: string, weightOz: string, weightUnit: SkuWeightUnit, packageTypeId: string) => {
    const pkgType = packageTypes?.find((pt) => pt.id === packageTypeId);
    const parts = [
      productName,
      weightOz ? `${weightOz}${weightUnit}` : '',
      pkgType?.name ?? '',
    ].filter(Boolean);
    return parts.join(' ');
  };

  // SKU form handlers
  const handleOpenSkuForm = (productId: string, sku?: Sku) => {
    // Set the expanded product ID so SKU hooks work correctly
    setExpandedProductId(productId);

    if (sku) {
      setEditingSku(sku);
      setSkuFormData({
        skuCode: sku.skuCode,
        name: sku.name,
        weightOz: sku.weightOz.toString(),
        weightUnit: (sku.weightUnit as SkuWeightUnit) ?? 'oz',
        price: centsToDollars(sku.price).toString(),
        isAvailable: sku.isAvailable,
        isPublic: sku.isPublic,
        stockQuantity: sku.stockQuantity?.toString() ?? '',
        lowStockThreshold: sku.lowStockThreshold?.toString() ?? '',
        salesChannel: (sku.salesChannel as SalesChannel) ?? 'BOTH',
        packageTypeId: sku.packageTypeId ?? '',
      });
    } else {
      setEditingSku(null);
      const product = products?.find((p) => p.id === productId);
      setSkuFormData({
        ...emptySkuForm,
        skuCode: generateSkuCode(product?.name ?? '', '', 'oz', ''),
        name: generateSkuName(product?.name ?? '', '', 'oz', ''),
      });
    }
    setSkuFormError(null);
    setShowSkuForm(true);
  };

  // Update SKU code and name when weight, unit, or package type changes (only for new SKUs)
  const handleSkuFieldChange = (field: keyof SkuFormData, value: string | boolean) => {
    const newFormData = { ...skuFormData, [field]: value };

    // Auto-generate SKU code and name when weight, weightUnit, or packageTypeId changes (only for new SKUs)
    if (!editingSku && (field === 'weightOz' || field === 'weightUnit' || field === 'packageTypeId')) {
      const product = products?.find((p) => p.id === expandedProductId);
      const newWeight = field === 'weightOz' ? (value as string) : skuFormData.weightOz;
      const newWeightUnit = field === 'weightUnit' ? (value as SkuWeightUnit) : skuFormData.weightUnit;
      const newPackageTypeId = field === 'packageTypeId' ? (value as string) : skuFormData.packageTypeId;
      newFormData.skuCode = generateSkuCode(product?.name ?? '', newWeight, newWeightUnit, newPackageTypeId);
      newFormData.name = generateSkuName(product?.name ?? '', newWeight, newWeightUnit, newPackageTypeId);
    }

    setSkuFormData(newFormData);
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
      weightUnit: skuFormData.weightUnit,
      price: dollarsToCents(parseFloat(skuFormData.price)),
      isAvailable: skuFormData.isAvailable,
      isPublic: skuFormData.isPublic,
      stockQuantity: skuFormData.stockQuantity ? parseInt(skuFormData.stockQuantity) : undefined,
      lowStockThreshold: skuFormData.lowStockThreshold
        ? parseInt(skuFormData.lowStockThreshold)
        : undefined,
      salesChannel: skuFormData.salesChannel,
      packageTypeId: skuFormData.packageTypeId || undefined,
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

  // Filter to only varieties (not blends) for stats
  const varieties = products?.filter((p) => !p.isBlend) ?? [];

  const avgYield = varieties.length
    ? (varieties.reduce((sum, p) => sum + (p.avgYieldPerTray ?? 0), 0) / varieties.length).toFixed(1)
    : '0';

  const avgGrowthDays = varieties.length
    ? Math.round(varieties.reduce((sum, p) => sum + getTotalGrowthDays(p), 0) / varieties.length)
    : 0;

  const readyCount = varieties.filter(isReady).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Varieties & Mixes</h1>
          <p className="text-muted-foreground">Manage crop varieties, mixes, and production parameters</p>
        </div>
        {activeTab === 'varieties' && (
          <button
            onClick={() => handleOpenProductForm()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Variety
          </button>
        )}
        {activeTab === 'mixes' && (
          <button
            onClick={() => {
              setEditingBlend(null);
              setMixName('');
              setMixDescription('');
              setMixIsActive(true);
              setMixIngredients([
                { productId: '', ratioPercent: '' },
                { productId: '', ratioPercent: '' },
              ]);
              setMixError(null);
              setShowMixForm(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Create Mix
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('varieties')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'varieties'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Varieties
          </button>
          <button
            onClick={() => setActiveTab('mixes')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mixes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mixes ({blends?.length ?? 0})
          </button>
        </nav>
      </div>

      {/* Varieties Tab */}
      {activeTab === 'varieties' && (
        <>
          {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Varieties</p>
          <p className="text-2xl font-bold">{varieties.length}</p>
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
      ) : varieties.length === 0 ? (
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
              {varieties.map((product) => (
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
                                      <td className="px-3 py-2 text-center">{sku.weightOz} {sku.weightUnit || 'oz'}</td>
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
        </>
      )}

      {/* Mixes Tab */}
      {activeTab === 'mixes' && (
        <div className="space-y-4">
          {blendsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading mixes...</div>
          ) : blends?.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold">No mixes yet</h3>
              <p className="text-muted-foreground mb-4">Create mixes to combine multiple varieties into a single product.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left text-sm">
                    <th className="px-4 py-3 font-medium w-10"></th>
                    <th className="px-4 py-3 font-medium">Mix Name</th>
                    <th className="px-4 py-3 font-medium">Ingredients</th>
                    <th className="px-4 py-3 font-medium text-center">Growth Days</th>
                    <th className="px-4 py-3 font-medium text-center">SKUs</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {blends?.map((blend) => (
                    <>
                      <tr
                        key={blend.id}
                        className={`hover:bg-muted/30 ${expandedMixId === blend.id ? 'bg-muted/20' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedMixId(expandedMixId === blend.id ? null : blend.id)}
                            className="p-1 hover:bg-muted rounded"
                            title="Show SKUs"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                expandedMixId === blend.id ? 'rotate-90' : ''
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
                        <td className="px-4 py-3">
                          <div className="font-medium">{blend.name}</div>
                          {blend.description && (
                            <div className="text-xs text-muted-foreground">{blend.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-muted-foreground">
                            {blend.ingredientSummary || blend.ingredients.map((ing) => ing.product?.name).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{blend.maxGrowthDays}</td>
                        <td className="px-4 py-3 text-center">
                          {/* SKU count would need to be fetched - showing placeholder */}
                          <span className="text-muted-foreground">-</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              blend.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {blend.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingBlend(blend.id);
                                setMixName(blend.name);
                                setMixDescription(blend.description ?? '');
                                setMixIsActive(blend.isActive);
                                setMixIngredients(
                                  blend.ingredients.map((ing) => ({
                                    productId: ing.productId,
                                    ratioPercent: ing.ratioPercent.toString(),
                                  }))
                                );
                                setMixError(null);
                                setShowMixForm(true);
                              }}
                              className="text-sm text-primary hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this mix?')) return;
                                await deleteBlend.mutateAsync(blend.id);
                              }}
                              className="text-sm text-destructive hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded SKU section */}
                      {expandedMixId === blend.id && (
                        <tr key={`${blend.id}-skus`}>
                          <td colSpan={7} className="bg-muted/10 px-4 py-4">
                            <div className="ml-8">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-sm">SKUs for {blend.name}</h4>
                                <button
                                  onClick={() => handleOpenSkuForm(blend.productId)}
                                  className="text-sm text-primary hover:underline"
                                >
                                  + Add SKU
                                </button>
                              </div>
                              {mixSkusLoading ? (
                                <p className="text-sm text-muted-foreground">Loading SKUs...</p>
                              ) : mixSkus?.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No SKUs yet. Add package sizes for this mix.
                                </p>
                              ) : (
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/30">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium">SKU Code</th>
                                        <th className="px-3 py-2 text-left font-medium">Name</th>
                                        <th className="px-3 py-2 text-center font-medium">Weight</th>
                                        <th className="px-3 py-2 text-center font-medium">Price</th>
                                        <th className="px-3 py-2 text-center font-medium">Status</th>
                                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {mixSkus?.map((sku) => (
                                        <tr key={sku.id} className="hover:bg-muted/20">
                                          <td className="px-3 py-2 font-mono text-xs">{sku.skuCode}</td>
                                          <td className="px-3 py-2">{sku.name}</td>
                                          <td className="px-3 py-2 text-center">{sku.weightOz} {sku.weightUnit || 'oz'}</td>
                                          <td className="px-3 py-2 text-center">{formatPrice(sku.price)}</td>
                                          <td className="px-3 py-2 text-center">
                                            <span
                                              className={`px-2 py-0.5 text-xs rounded-full ${
                                                sku.isAvailable
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : 'bg-gray-100 text-gray-600'
                                              }`}
                                            >
                                              {sku.isAvailable ? 'Available' : 'Unavailable'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                              <button
                                                onClick={() => handleOpenSkuForm(blend.productId, sku)}
                                                className="text-xs text-primary hover:underline"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={async () => {
                                                  if (!confirm('Delete this SKU?')) return;
                                                  await deleteSkuDynamic.mutateAsync({
                                                    productId: blend.productId,
                                                    skuId: sku.id,
                                                  });
                                                }}
                                                className="text-xs text-destructive hover:underline"
                                              >
                                                Delete
                                              </button>
                                            </div>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight *</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={skuFormData.weightOz}
                      onChange={(e) => handleSkuFieldChange('weightOz', e.target.value)}
                      className="w-16 px-2 py-2 border rounded-md bg-background"
                      placeholder="3"
                      autoFocus
                    />
                    <select
                      value={skuFormData.weightUnit}
                      onChange={(e) => handleSkuFieldChange('weightUnit', e.target.value)}
                      className="w-14 px-1 py-2 border rounded-md bg-background text-sm"
                    >
                      <option value="oz">oz</option>
                      <option value="lb">lb</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Package Type</label>
                  <select
                    value={skuFormData.packageTypeId}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setEditingPackageType(null);
                        setPackageTypeName('');
                        setPackageTypeCode('');
                        setPackageTypeError(null);
                        setShowPackageTypeModal(true);
                      } else {
                        handleSkuFieldChange('packageTypeId', e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Select...</option>
                    {packageTypes?.filter((pt) => pt.isActive).map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name} ({pt.code})
                      </option>
                    ))}
                    <option value="__add_new__" className="text-primary">+ Add/Edit Package Types</option>
                  </select>
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
                  <label className="block text-sm font-medium mb-1">Sales Channel</label>
                  <select
                    value={skuFormData.salesChannel}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, salesChannel: e.target.value as SalesChannel })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="BOTH">Both</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="RETAIL">Retail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={skuFormData.skuCode}
                    onChange={(e) =>
                      setSkuFormData({ ...skuFormData, skuCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background font-mono"
                    placeholder="Auto-generated"
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
                  placeholder="e.g., 4oz Arugula Clamshell"
                />
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

      {/* Create/Edit Mix Modal */}
      {showMixForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingBlend ? 'Edit Mix' : 'Create Mix'}</h2>
              <button
                onClick={() => setShowMixForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setMixError(null);

                const validIngredients = mixIngredients.filter((ing) => ing.productId && ing.ratioPercent);
                if (validIngredients.length < 2) {
                  setMixError('At least 2 ingredients are required');
                  return;
                }

                const totalPercent = validIngredients.reduce((sum, ing) => sum + parseFloat(ing.ratioPercent), 0);
                if (Math.abs(totalPercent - 100) > 0.1) {
                  setMixError('Ingredient ratios must add up to 100%');
                  return;
                }

                try {
                  if (editingBlend) {
                    // Update existing blend
                    await updateBlend.mutateAsync({
                      blendId: editingBlend,
                      data: {
                        name: mixName,
                        description: mixDescription || undefined,
                        isActive: mixIsActive,
                        ingredients: validIngredients.map((ing) => ({
                          productId: ing.productId,
                          ratioPercent: parseFloat(ing.ratioPercent),
                        })),
                      },
                    });
                  } else {
                    // Create new blend
                    const mixData: CreateBlend = {
                      name: mixName,
                      description: mixDescription || undefined,
                      ingredients: validIngredients.map((ing) => ({
                        productId: ing.productId,
                        ratioPercent: parseFloat(ing.ratioPercent),
                      })),
                    };
                    await createBlend.mutateAsync(mixData);
                  }
                  setShowMixForm(false);
                } catch (err) {
                  setMixError(err instanceof Error ? err.message : `Failed to ${editingBlend ? 'update' : 'create'} mix`);
                }
              }}
              className="p-6 space-y-4"
            >
              {mixError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {mixError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Mix Name *</label>
                <input
                  type="text"
                  value={mixName}
                  onChange={(e) => setMixName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., Spicy Salad Mix"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={mixDescription}
                  onChange={(e) => setMixDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., A zesty mix of radish and mustard"
                  rows={2}
                />
              </div>

              {editingBlend && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mixIsActive"
                    checked={mixIsActive}
                    onChange={(e) => setMixIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="mixIsActive" className="text-sm font-medium">Active</label>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Ingredients</label>
                  <button
                    type="button"
                    onClick={() => setMixIngredients([...mixIngredients, { productId: '', ratioPercent: '' }])}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add ingredient
                  </button>
                </div>
                <div className="space-y-2">
                  {mixIngredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={ing.productId}
                        onChange={(e) => {
                          const updated = [...mixIngredients];
                          updated[index].productId = e.target.value;
                          setMixIngredients(updated);
                        }}
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                      >
                        <option value="">Select variety...</option>
                        {products?.filter((p) => !p.isBlend).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="%"
                        value={ing.ratioPercent}
                        onChange={(e) => {
                          const updated = [...mixIngredients];
                          updated[index].ratioPercent = e.target.value;
                          setMixIngredients(updated);
                        }}
                        className="w-20 px-3 py-2 border rounded-md bg-background text-sm"
                      />
                      {mixIngredients.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setMixIngredients(mixIngredients.filter((_, i) => i !== index))}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Total: {mixIngredients.reduce((sum, ing) => sum + parseFloat(ing.ratioPercent || '0'), 0).toFixed(1)}%
                  {Math.abs(mixIngredients.reduce((sum, ing) => sum + parseFloat(ing.ratioPercent || '0'), 0) - 100) > 0.1 && (
                    <span className="text-amber-600 ml-2">(must equal 100%)</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMixForm(false)}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBlend.isPending || updateBlend.isPending || !mixName.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createBlend.isPending || updateBlend.isPending
                    ? (editingBlend ? 'Saving...' : 'Creating...')
                    : (editingBlend ? 'Save Changes' : 'Create Mix')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Type Management Modal */}
      {showPackageTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Manage Package Types</h2>
              <button
                onClick={() => setShowPackageTypeModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {packageTypeError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {packageTypeError}
                </div>
              )}

              {/* Add/Edit Form */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium mb-3">
                  {editingPackageType ? 'Edit Package Type' : 'Add New Package Type'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={packageTypeName}
                      onChange={(e) => setPackageTypeName(e.target.value)}
                      placeholder="e.g., Clamshell"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Code (for SKU)</label>
                    <input
                      type="text"
                      value={packageTypeCode}
                      onChange={(e) => setPackageTypeCode(e.target.value.toUpperCase())}
                      placeholder="e.g., CL"
                      maxLength={5}
                      className="w-full px-3 py-2 border rounded-md bg-background font-mono uppercase"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This code will be added to SKU codes (e.g., ARU-4OZ-CL)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {editingPackageType && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPackageType(null);
                          setPackageTypeName('');
                          setPackageTypeCode('');
                        }}
                        className="px-3 py-2 border rounded-md hover:bg-muted"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!packageTypeName.trim() || !packageTypeCode.trim()) {
                          setPackageTypeError('Name and code are required');
                          return;
                        }
                        setPackageTypeError(null);
                        try {
                          if (editingPackageType) {
                            await updatePackageType.mutateAsync({
                              id: editingPackageType.id,
                              data: { name: packageTypeName.trim(), code: packageTypeCode.trim() },
                            });
                          } else {
                            await createPackageType.mutateAsync({
                              name: packageTypeName.trim(),
                              code: packageTypeCode.trim(),
                            });
                          }
                          setEditingPackageType(null);
                          setPackageTypeName('');
                          setPackageTypeCode('');
                        } catch (err) {
                          setPackageTypeError(err instanceof Error ? err.message : 'Failed to save');
                        }
                      }}
                      disabled={createPackageType.isPending || updatePackageType.isPending}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {editingPackageType ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Package Types */}
              <div>
                <h3 className="font-medium mb-2">Existing Package Types</h3>
                {packageTypesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : packageTypes && packageTypes.length > 0 ? (
                  <div className="space-y-2">
                    {packageTypes.map((pt) => (
                      <div
                        key={pt.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{pt.name}</span>
                          <span className="ml-2 text-xs font-mono text-muted-foreground">({pt.code})</span>
                          {!pt.isActive && (
                            <span className="ml-2 text-xs text-amber-600">(inactive)</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPackageType(pt);
                              setPackageTypeName(pt.name);
                              setPackageTypeCode(pt.code);
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete "${pt.name}"? SKUs using this type will need to be updated.`)) return;
                              try {
                                await deletePackageType.mutateAsync(pt.id);
                              } catch (err) {
                                setPackageTypeError(err instanceof Error ? err.message : 'Failed to delete');
                              }
                            }}
                            className="text-sm text-destructive hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No package types defined.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
