import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFarmStore } from '@/stores/farm-store';
import { useFarm, useSkus, useOrders, useUpdateSkuDynamic } from '@/lib/api-client';
import { LogoUpload } from '@/components/LogoUpload';

const API_BASE = 'http://localhost:3000';

interface SkuFormData {
  name: string;
  skuCode: string;
  weightOz: number;
  price: number;
}

export default function StorePage() {
  const { currentFarmId } = useFarmStore();
  const queryClient = useQueryClient();
  const { data: farm } = useFarm(currentFarmId ?? undefined);
  const { data: skus, isLoading: skusLoading } = useSkus(currentFarmId ?? undefined);
  const { data: orders, isLoading: ordersLoading } = useOrders(currentFarmId ?? undefined);
  const updateSku = useUpdateSkuDynamic(currentFarmId ?? '');

  const [activeTab, setActiveTab] = useState<'skus' | 'orders' | 'share'>('skus');
  const [copied, setCopied] = useState(false);
  const [editingSku, setEditingSku] = useState<{
    id: string;
    productId: string;
    productName: string;
    imageUrl: string | null;
  } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editForm, setEditForm] = useState<SkuFormData>({
    name: '',
    skuCode: '',
    weightOz: 0,
    price: 0,
  });
  const [saving, setSaving] = useState(false);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage your store.</p>
        </div>
      </div>
    );
  }

  // Filter orders from storefront
  const storefrontOrders = orders?.filter(o => o.orderSource === 'STOREFRONT') ?? [];

  // Generate storefront URL
  const storefrontUrl = farm?.slug
    ? `${window.location.origin}/order/${farm.slug}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storefrontUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAvailability = async (skuId: string, productId: string, currentValue: boolean) => {
    try {
      await updateSku.mutateAsync({
        productId,
        skuId,
        data: { isAvailable: !currentValue },
      });
    } catch (error) {
      console.error('Failed to update SKU:', error);
    }
  };

  const handleTogglePublic = async (skuId: string, productId: string, currentValue: boolean) => {
    try {
      await updateSku.mutateAsync({
        productId,
        skuId,
        data: { isPublic: !currentValue },
      });
    } catch (error) {
      console.error('Failed to update SKU:', error);
    }
  };

  const handleImageUpload = async (skuId: string, productId: string, file: File) => {
    if (!currentFarmId) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/farms/${currentFarmId}/products/${productId}/skus/${skuId}/image`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer dev-token',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['skus', currentFarmId] });
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleOpenEdit = (sku: typeof skus[0]) => {
    setEditingSku({
      id: sku.id,
      productId: sku.productId,
      productName: sku.product?.name ?? 'Unknown Product',
      imageUrl: sku.imageUrl ?? null,
    });
    setEditForm({
      name: sku.name,
      skuCode: sku.skuCode,
      weightOz: sku.weightOz,
      price: sku.price / 100, // Convert cents to dollars for display
    });
  };

  const handleEditImageUpload = async (file: File) => {
    if (!editingSku || !currentFarmId) return;
    setUploadingImage(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/farms/${currentFarmId}/products/${editingSku.productId}/skus/${editingSku.id}/image`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer dev-token',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      // Update the editing SKU state with new image URL
      setEditingSku({ ...editingSku, imageUrl: result.data.imageUrl });
      // Refresh SKU list
      queryClient.invalidateQueries({ queryKey: ['skus', currentFarmId] });
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteEditImage = async () => {
    if (!editingSku || !currentFarmId) return;
    setUploadingImage(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/farms/${currentFarmId}/products/${editingSku.productId}/skus/${editingSku.id}/image`,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer dev-token',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Update the editing SKU state
      setEditingSku({ ...editingSku, imageUrl: null });
      // Refresh SKU list
      queryClient.invalidateQueries({ queryKey: ['skus', currentFarmId] });
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSku) return;
    setSaving(true);

    try {
      await updateSku.mutateAsync({
        productId: editingSku.productId,
        skuId: editingSku.id,
        data: {
          name: editForm.name,
          skuCode: editForm.skuCode,
          weightOz: editForm.weightOz,
          price: Math.round(editForm.price * 100), // Convert dollars to cents
        },
      });
      setEditingSku(null);
    } catch (error) {
      console.error('Failed to update SKU:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Store</h1>
        <p className="text-muted-foreground">Manage your storefront, SKUs, and customer orders</p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {(['skus', 'orders', 'share'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'skus' && 'SKU Management'}
              {tab === 'orders' && `Storefront Orders (${storefrontOrders.length})`}
              {tab === 'share' && 'Share Storefront'}
            </button>
          ))}
        </nav>
      </div>

      {/* SKU Management Tab */}
      {activeTab === 'skus' && (
        <div className="space-y-4">
          {skusLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading SKUs...</div>
            </div>
          ) : !skus?.length ? (
            <div className="border rounded-lg p-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold">No SKUs Found</h3>
              <p className="text-muted-foreground">
                Add SKUs to your products from the Varieties page to manage them here.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium w-16">Image</th>
                    <th className="text-left px-4 py-3 font-medium">Product / SKU</th>
                    <th className="text-left px-4 py-3 font-medium">Weight</th>
                    <th className="text-left px-4 py-3 font-medium">Price</th>
                    <th className="text-center px-4 py-3 font-medium">Available</th>
                    <th className="text-center px-4 py-3 font-medium">Public</th>
                    <th className="text-center px-4 py-3 font-medium w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {skus.map((sku) => (
                    <tr key={sku.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(sku.id, sku.productId, file);
                            }}
                          />
                          {sku.imageUrl ? (
                            <img
                              src={`http://localhost:3000${sku.imageUrl}`}
                              alt={sku.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                              +
                            </div>
                          )}
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{sku.product?.name ?? 'Unknown Product'}</div>
                        <div className="text-sm text-muted-foreground">
                          {sku.name} ({sku.skuCode})
                        </div>
                      </td>
                      <td className="px-4 py-3">{sku.weightOz}oz</td>
                      <td className="px-4 py-3">{formatPrice(sku.price)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAvailability(sku.id, sku.productId, sku.isAvailable)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            sku.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              sku.isAvailable ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleTogglePublic(sku.id, sku.productId, sku.isPublic)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            sku.isPublic ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              sku.isPublic ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenEdit(sku)}
                          className="px-3 py-1 text-sm border rounded hover:bg-muted"
                        >
                          Edit
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

      {/* Storefront Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {ordersLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading orders...</div>
            </div>
          ) : storefrontOrders.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold">No Storefront Orders</h3>
              <p className="text-muted-foreground">
                Orders placed through your public storefront will appear here.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Order</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Items</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {storefrontOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                      <td className="px-4 py-3">{order.customerName}</td>
                      <td className="px-4 py-3">{order.items?.length ?? 0} items</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Share Storefront Tab */}
      {activeTab === 'share' && (
        <div className="space-y-6">
          {/* Branding Section */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Storefront Branding</h3>
            <p className="text-muted-foreground mb-4">
              Upload your farm logo to display on your public storefront.
            </p>
            <LogoUpload farmId={currentFarmId} currentLogoUrl={farm?.logoUrl} />
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Your Storefront Link</h3>
            <p className="text-muted-foreground mb-4">
              Share this link with customers so they can place orders directly.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={storefrontUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-muted/30 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            <div className="mt-6">
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                Open storefront in new tab →
              </a>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Storefront Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Public SKUs available:</span>
                <span className="font-medium">
                  {skus?.filter(s => s.isPublic && s.isAvailable).length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Storefront orders this month:</span>
                <span className="font-medium">
                  {storefrontOrders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    const now = new Date();
                    return orderDate.getMonth() === now.getMonth() &&
                           orderDate.getFullYear() === now.getFullYear();
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit SKU Modal */}
      {editingSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingSku(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Edit SKU</h2>
                <p className="text-sm text-muted-foreground">{editingSku.productName}</p>
              </div>
              <button
                onClick={() => setEditingSku(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 4oz Arugula"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">SKU Code</label>
                <input
                  type="text"
                  value={editForm.skuCode}
                  onChange={(e) => setEditForm({ ...editForm, skuCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., ARU-4OZ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (oz)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editForm.weightOz}
                    onChange={(e) => setEditForm({ ...editForm, weightOz: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium mb-2">Product Image</label>
                <div className="flex items-start gap-4">
                  {editingSku.imageUrl ? (
                    <div className="relative">
                      <img
                        src={`${API_BASE}${editingSku.imageUrl}`}
                        alt={editForm.name}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <button
                        onClick={handleDeleteEditImage}
                        disabled={uploadingImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                        title="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                      <span className="text-2xl text-gray-400">📷</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEditImageUpload(file);
                        }}
                        disabled={uploadingImage}
                      />
                      <span className={`inline-flex items-center px-3 py-2 text-sm border rounded-md ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
                        {uploadingImage ? 'Uploading...' : editingSku.imageUrl ? 'Change Image' : 'Upload Image'}
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or WebP. Max 2MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setEditingSku(null)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
