import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import {
  useOrders,
  useTasks,
  useProducts,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useUpdateTask,
} from '@/lib/api-client';
import type { Product, CreateOrder, Order, Task } from '@farm/shared';
import { calculateProductionSchedule } from '@farm/shared';

type ViewMode = 'orders' | 'tasks';

interface OrderItemInput {
  productId: string;
  quantityOz: string;
  harvestDate: string;
  overagePercent: string;
}

const emptyOrderItem: OrderItemInput = {
  productId: '',
  quantityOz: '',
  harvestDate: '',
  overagePercent: '10',
};

export default function PlanningPage() {
  const { currentFarmId } = useFarmStore();
  const { data: orders, isLoading: ordersLoading } = useOrders(currentFarmId ?? undefined);
  const { data: tasks } = useTasks(currentFarmId ?? undefined);
  const { data: products } = useProducts(currentFarmId ?? undefined);
  const createOrder = useCreateOrder(currentFarmId ?? '');
  const updateOrder = useUpdateOrder(currentFarmId ?? '');
  const deleteOrder = useDeleteOrder(currentFarmId ?? '');
  const updateTask = useUpdateTask(currentFarmId ?? '');

  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Order form state
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('PENDING');
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([{ ...emptyOrderItem }]);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm to access planning.</p>
        </div>
      </div>
    );
  }

  const readyProducts = products?.filter(
    // daysSoaking is optional - some seeds don't need soaking
    (p) => p.daysGermination != null && p.daysLight != null && p.avgYieldPerTray != null
  ) ?? [];

  const activeOrders = orders?.filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS') ?? [];
  const todayStr = new Date().toDateString();
  const todayTasks = tasks?.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === todayStr) ?? [];
  const pendingTasks = tasks?.filter((t) => t.status === 'TODO') ?? [];

  // Get tasks for this week
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekTasks = tasks?.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= now && due <= weekEnd;
  }) ?? [];

  const handleAddItem = () => {
    setOrderItems([...orderItems, { ...emptyOrderItem }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: string) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const getProductById = (id: string): Product | undefined => {
    return products?.find((p) => p.id === id);
  };

  const calculatePreview = (item: OrderItemInput): { schedule: ReturnType<typeof calculateProductionSchedule>; error: string | null } | null => {
    const product = getProductById(item.productId);
    if (!product || !item.quantityOz || !item.harvestDate) return null;
    // daysSoaking is optional - some seeds don't need soaking
    if (product.avgYieldPerTray == null || product.daysGermination == null || product.daysLight == null) {
      return null;
    }

    try {
      const schedule = calculateProductionSchedule({
        quantityOz: parseFloat(item.quantityOz),
        avgYieldPerTray: product.avgYieldPerTray,
        overagePercent: parseFloat(item.overagePercent) || 10,
        harvestDate: new Date(item.harvestDate),
        daysSoaking: product.daysSoaking, // can be null
        daysGermination: product.daysGermination,
        daysLight: product.daysLight,
      });

      // Check if seed date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (schedule.seedDate < today) {
        return {
          schedule,
          error: 'Harvest date is too soon - seed date would be in the past. Please choose a later harvest date.',
        };
      }

      return { schedule, error: null };
    } catch {
      return null;
    }
  };

  const handleOpenCreateOrder = () => {
    setEditingOrder(null);
    setCustomer('');
    setNotes('');
    setOrderStatus('PENDING');
    setOrderItems([{ ...emptyOrderItem }]);
    setFormError(null);
    setShowOrderModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setCustomer(order.customer || '');
    setNotes(order.notes || '');
    setOrderStatus(order.status);
    // Convert existing order items to form format
    const items: OrderItemInput[] = order.items?.map((item) => ({
      productId: item.productId,
      quantityOz: item.quantityOz.toString(),
      harvestDate: new Date(item.harvestDate).toISOString().split('T')[0],
      overagePercent: (item.overagePercent || 10).toString(),
    })) || [{ ...emptyOrderItem }];
    setOrderItems(items.length > 0 ? items : [{ ...emptyOrderItem }]);
    setFormError(null);
    setShowOrderModal(true);
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setEditingOrder(null);
    setCustomer('');
    setNotes('');
    setOrderStatus('PENDING');
    setOrderItems([{ ...emptyOrderItem }]);
    setFormError(null);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validItems = orderItems.filter((item) => item.productId && item.quantityOz && item.harvestDate);
    if (validItems.length === 0) {
      setFormError('At least one complete item is required');
      return;
    }

    // Validate that no seed dates are in the past (only for new orders or changed items)
    for (const item of validItems) {
      const preview = calculatePreview(item);
      if (preview?.error) {
        const product = getProductById(item.productId);
        setFormError(`${product?.name || 'Item'}: ${preview.error}`);
        return;
      }
    }

    const orderData: CreateOrder = {
      customer: customer.trim() || undefined,
      notes: notes.trim() || undefined,
      orderNumber: editingOrder?.orderNumber, // Preserve order number when editing
      items: validItems.map((item) => ({
        productId: item.productId,
        quantityOz: parseFloat(item.quantityOz),
        harvestDate: new Date(item.harvestDate),
        overagePercent: parseFloat(item.overagePercent) || 10,
      })),
    };

    try {
      if (editingOrder) {
        // For edit: delete old order and create new one with same order number (to regenerate tasks)
        await deleteOrder.mutateAsync(editingOrder.id);
        await createOrder.mutateAsync(orderData);
      } else {
        await createOrder.mutateAsync(orderData);
      }
      handleCloseOrderModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This will also delete all associated tasks.')) return;
    try {
      await deleteOrder.mutateAsync(orderId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask.mutateAsync({ taskId, data: { status: 'COMPLETED' } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'READY':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'DELIVERED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SOAK: 'Soak',
      SEED: 'Seed',
      MOVE_TO_LIGHT: 'Move to Light',
      HARVESTING: 'Harvest',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Planning</h1>
          <p className="text-muted-foreground">Manage orders and production tasks</p>
        </div>
        <button
          onClick={handleOpenCreateOrder}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Create Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Active Orders</p>
          <p className="text-2xl font-bold">{activeOrders.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Today's Tasks</p>
          <p className="text-2xl font-bold">{todayTasks.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Pending Tasks</p>
          <p className="text-2xl font-bold">{pendingTasks.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold">{weekTasks.length}</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setViewMode('orders')}
          className={`px-4 py-2 -mb-px ${viewMode === 'orders' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
        >
          Orders
        </button>
        <button
          onClick={() => setViewMode('tasks')}
          className={`px-4 py-2 -mb-px ${viewMode === 'tasks' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
        >
          Tasks
        </button>
      </div>

      {/* Content */}
      {viewMode === 'orders' && (
        <div>
          {ordersLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
          ) : orders?.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold">No orders yet</h3>
              <p className="text-muted-foreground mb-4">Create your first order to start production planning.</p>
              <button
                onClick={handleOpenCreateOrder}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Create Order
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders?.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{order.orderNumber}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{item.product?.name}</span>
                          <span className="text-muted-foreground">{item.quantityOz} oz</span>
                          <span className="text-muted-foreground">{item.traysNeeded} trays</span>
                        </div>
                        <div className="text-muted-foreground">
                          Harvest: {formatDate(item.harvestDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'tasks' && (
        <div>
          {tasks?.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold">No tasks yet</h3>
              <p className="text-muted-foreground">Tasks will appear here when you create orders.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks
                ?.filter((t) => t.status !== 'COMPLETED')
                .sort((a, b) => {
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                })
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border rounded-lg px-4 py-3 bg-card hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="w-5 h-5 rounded border-2 border-muted-foreground hover:border-primary flex items-center justify-center"
                        title="Mark complete"
                      >
                        {task.status === 'COMPLETED' && (
                          <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm px-2 py-0.5 rounded bg-muted">{getTaskTypeLabel(task.type)}</span>
                      <span className="text-sm text-muted-foreground">
                        {task.dueDate ? formatDate(task.dueDate) : 'No date'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingOrder ? `Edit Order ${editingOrder.orderNumber}` : 'Create Order'}
              </h2>
              <button
                onClick={handleCloseOrderModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {formError}
                </div>
              )}

              {readyProducts.length === 0 && (
                <div className="p-3 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md">
                  No varieties are ready for ordering. Please complete variety data (days, yield) in the Varieties page first.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., Local Restaurant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Order Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm text-primary hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {orderItems.map((item, index) => {
                    const preview = calculatePreview(item);
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-muted/30">
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div className="col-span-2">
                            <label className="block text-xs text-muted-foreground mb-1">Variety</label>
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                              <option value="">Select variety...</option>
                              {readyProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Quantity (oz)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.quantityOz}
                              onChange={(e) => handleItemChange(index, 'quantityOz', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              placeholder="e.g., 16"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Overage %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.overagePercent}
                              onChange={(e) => handleItemChange(index, 'overagePercent', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Harvest Date</label>
                            <input
                              type="date"
                              value={item.harvestDate}
                              onChange={(e) => handleItemChange(index, 'harvestDate', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            />
                          </div>
                          {preview && (
                            <>
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">Trays</div>
                                <div className="font-medium">{preview.schedule.traysNeeded}</div>
                              </div>
                              {preview.schedule.requiresSoaking && (
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground mb-1">Soak</div>
                                  <div className="font-medium text-sm">{formatDate(preview.schedule.soakDate)}</div>
                                </div>
                              )}
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">Seed</div>
                                <div className={`font-medium text-sm ${preview.error ? 'text-destructive' : ''}`}>
                                  {formatDate(preview.schedule.seedDate)}
                                </div>
                              </div>
                            </>
                          )}
                          {preview?.error && (
                            <div className="col-span-4 text-sm text-destructive mt-2">
                              {preview.error}
                            </div>
                          )}
                        </div>
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="mt-3 text-xs text-destructive hover:underline"
                          >
                            Remove item
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingOrder && (
                <div className="p-3 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                  Note: Saving changes will regenerate the production tasks for this order.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseOrderModal}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrder.isPending || deleteOrder.isPending || readyProducts.length === 0}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createOrder.isPending || deleteOrder.isPending
                    ? 'Saving...'
                    : editingOrder
                    ? 'Save Changes'
                    : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
