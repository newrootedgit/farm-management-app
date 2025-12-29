import { useFarmStore } from '@/stores/farm-store';
import { useProducts } from '@/lib/api-client';

export default function InventoryPage() {
  const { currentFarmId } = useFarmStore();
  const { data: products, isLoading } = useProducts(currentFarmId ?? undefined);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Track products, seed weights, and stock levels</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
            Import CSV
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Add Product
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{products?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Low Stock Items</p>
          <p className="text-2xl font-bold text-destructive">0</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Product table placeholder */}
      <div className="border rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-semibold">Inventory Management</h3>
        <p className="text-muted-foreground">Product catalog and stock tracking will appear here.</p>
      </div>
    </div>
  );
}
