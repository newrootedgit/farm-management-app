import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import {
  useOrders,
  useTasks,
  useProducts,
  useSkus,
  useCreateOrder,
  useDeleteOrder,
  useCloneOrder,
  useRecurringSchedules,
  useCreateRecurringSchedule,
  useDeleteRecurringSchedule,
  useUpdateRecurringSchedule,
  useGenerateRecurringOrder,
  useBlends,
  type BlendWithIngredients,
} from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { OrderViewModal } from '@/components/orders/OrderViewModal';
import type { Product, CreateOrder, Order, OrderWithItems, CreateRecurringOrderSchedule } from '@farm/shared';
import { calculateProductionSchedule, calculateBlendProductionSchedule, getShortDayName } from '@farm/shared';

type ViewMode = 'orders' | 'recurring';

interface OrderItemInput {
  productId: string;
  skuId: string;
  quantity: string; // Number of SKU units (e.g., 10 clamshells)
  harvestDate: string;
  overagePercent: string;
}

// Recurring items use oz-based quantities (simpler for auto-generation)
interface RecurringItemInput {
  productId: string;
  quantityOz: string;
  overagePercent: string;
}

const emptyOrderItem: OrderItemInput = {
  productId: '',
  skuId: '',
  quantity: '',
  harvestDate: '',
  overagePercent: '10',
};

const emptyRecurringItem: RecurringItemInput = {
  productId: '',
  quantityOz: '',
  overagePercent: '10',
};

export default function PlanningPage() {
  const { currentFarmId } = useFarmStore();
  const { data: orders, isLoading: ordersLoading } = useOrders(currentFarmId ?? undefined);
  const { data: tasks } = useTasks(currentFarmId ?? undefined);
  const { data: products } = useProducts(currentFarmId ?? undefined);
  const { data: skus } = useSkus(currentFarmId ?? undefined);
  const { data: recurringSchedules, isLoading: schedulesLoading } = useRecurringSchedules(currentFarmId ?? undefined);
  const { data: blends } = useBlends(currentFarmId ?? undefined);
  const createOrder = useCreateOrder(currentFarmId ?? '');
  const deleteOrder = useDeleteOrder(currentFarmId ?? '');
  const cloneOrder = useCloneOrder(currentFarmId ?? '');
  const createRecurringSchedule = useCreateRecurringSchedule(currentFarmId ?? '');
  const deleteRecurringSchedule = useDeleteRecurringSchedule(currentFarmId ?? '');
  const updateRecurringSchedule = useUpdateRecurringSchedule(currentFarmId ?? '');
  const generateRecurringOrder = useGenerateRecurringOrder(currentFarmId ?? '');
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null);

  // Clone order modal state
  const [cloningOrder, setCloningOrder] = useState<Order | null>(null);
  const [cloneDateOffset, setCloneDateOffset] = useState(7);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Order form state
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([{ ...emptyOrderItem }]);
  const [pastDateAcknowledged, setPastDateAcknowledged] = useState(false);

  // Recurring schedule modal state
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [recurringName, setRecurringName] = useState('');
  const [scheduleType, setScheduleType] = useState<'FIXED_DAY' | 'INTERVAL'>('FIXED_DAY');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState('7');
  const [recurringItems, setRecurringItems] = useState<RecurringItemInput[]>([{ ...emptyRecurringItem }]);

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
  const activeSchedules = recurringSchedules?.filter((s) => s.isActive) ?? [];

  const handleAddItem = () => {
    setOrderItems([...orderItems, { ...emptyOrderItem }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: string, additionalChanges?: Partial<OrderItemInput>) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value, ...additionalChanges };
    setOrderItems(updated);
  };

  const getProductById = (id: string): Product | undefined => {
    return products?.find((p) => p.id === id);
  };

  const getSkusForProduct = (productId: string) => {
    // Return all SKUs for this product, sorted by available first
    const productSkus = skus?.filter((s) => s.productId === productId) ?? [];
    return productSkus.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return 0;
    });
  };

  const getSkuById = (skuId: string) => {
    return skus?.find((s) => s.id === skuId);
  };

  // Get blend by product ID (blends are products with isBlend=true)
  const getBlendByProductId = (productId: string): BlendWithIngredients | undefined => {
    return blends?.find((b) => b.productId === productId);
  };

  // Calculate blend production schedule with ingredient breakdown
  const calculateBlendPreview = (item: OrderItemInput) => {
    const product = getProductById(item.productId);
    const blend = getBlendByProductId(item.productId);
    const quantityOz = calculateItemOz(item);
    if (!product || !blend || !quantityOz || !item.harvestDate) return null;
    if (!blend.ingredients || blend.ingredients.length === 0) return null;

    const ingredients = blend.ingredients.map((ing) => ({
      productId: ing.productId,
      productName: ing.product?.name ?? 'Unknown',
      ratioPercent: ing.ratioPercent,
      avgYieldPerTray: ing.product?.avgYieldPerTray ?? 10,
      daysSoaking: ing.product?.daysSoaking ?? null,
      daysGermination: ing.product?.daysGermination ?? 3,
      daysLight: ing.product?.daysLight ?? 5,
    }));

    return calculateBlendProductionSchedule({
      quantityOz,
      overagePercent: parseFloat(item.overagePercent) || 10,
      harvestDate: new Date(item.harvestDate),
      ingredients,
    });
  };

  // Calculate total oz from SKU quantity
  const calculateItemOz = (item: OrderItemInput): number => {
    const sku = getSkuById(item.skuId);
    if (!sku || !item.quantity) return 0;
    return parseFloat(item.quantity) * sku.weightOz;
  };

  // Calculate trays needed (doesn't require harvest date)
  const calculateItemTrays = (item: OrderItemInput): number => {
    const product = getProductById(item.productId);
    const quantityOz = calculateItemOz(item);
    if (!product || !quantityOz || !product.avgYieldPerTray) return 0;
    const overagePercent = parseFloat(item.overagePercent) || 10;
    const totalOzNeeded = quantityOz * (1 + overagePercent / 100);
    return Math.ceil(totalOzNeeded / product.avgYieldPerTray);
  };

  const calculatePreview = (item: OrderItemInput): { schedule: ReturnType<typeof calculateProductionSchedule>; error: string | null; warning: string | null } | null => {
    const product = getProductById(item.productId);
    const quantityOz = calculateItemOz(item);
    if (!product || !quantityOz || !item.harvestDate) return null;
    // daysSoaking is optional - some seeds don't need soaking
    if (product.avgYieldPerTray == null || product.daysGermination == null || product.daysLight == null) {
      return null;
    }

    try {
      const schedule = calculateProductionSchedule({
        quantityOz,
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
          error: null,
          warning: 'This harvest date is in the past or requires a past seed date. This is typically used for recording completed orders.',
        };
      }

      return { schedule, error: null, warning: null };
    } catch {
      return null;
    }
  };

  // Check if any item has a past date warning
  const hasPastDateWarning = orderItems.some((item) => {
    const preview = calculatePreview(item);
    return preview?.warning;
  });

  const handleOpenCreateOrder = () => {
    setEditingOrder(null);
    setCustomer('');
    setNotes('');
    setOrderItems([{ ...emptyOrderItem }]);
    setFormError(null);
    setPastDateAcknowledged(false);
    setShowOrderModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setCustomer(order.customer || '');
    setNotes(order.notes || '');
    // Convert existing order items to form format
    // Note: When editing, we convert oz back to quantity=1 with the oz as a "custom" amount
    // A better approach would be to store skuId on order items, but for now we'll use oz directly
    type OrderItemType = { productId: string; quantityOz: number; harvestDate: Date; overagePercent?: number };
    const orderItems_ = (order as { items?: OrderItemType[] }).items || [];
    const items: OrderItemInput[] = orderItems_.map((item) => {
      // Try to find a matching SKU for this product
      const productSkus = getSkusForProduct(item.productId);
      // Find the SKU that matches this quantity, or use the first available
      const matchingSku = productSkus.find((s) => item.quantityOz % s.weightOz === 0);
      const quantity = matchingSku ? Math.round(item.quantityOz / matchingSku.weightOz) : 1;
      return {
        productId: item.productId,
        skuId: matchingSku?.id || productSkus[0]?.id || '',
        quantity: matchingSku ? quantity.toString() : item.quantityOz.toString(),
        harvestDate: new Date(item.harvestDate).toISOString().split('T')[0],
        overagePercent: (item.overagePercent || 10).toString(),
      };
    });
    setOrderItems(items.length > 0 ? items : [{ ...emptyOrderItem }]);
    setFormError(null);
    setPastDateAcknowledged(false);
    setShowOrderModal(true);
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setEditingOrder(null);
    setCustomer('');
    setNotes('');
    setOrderItems([{ ...emptyOrderItem }]);
    setFormError(null);
    setPastDateAcknowledged(false);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validItems = orderItems.filter((item) => item.productId && item.skuId && item.quantity && item.harvestDate);
    if (validItems.length === 0) {
      setFormError('At least one complete item is required (variety, SKU, quantity, and harvest date)');
      return;
    }

    // Check for past date warnings - require acknowledgment
    if (hasPastDateWarning && !pastDateAcknowledged) {
      setFormError('Please acknowledge the past date warning before submitting');
      return;
    }

    // Validate items
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
        quantityOz: calculateItemOz(item),
        harvestDate: new Date(item.harvestDate),
        overagePercent: parseFloat(item.overagePercent) || 10,
      })),
    };

    try {
      let createdOrder: OrderWithItems;
      if (editingOrder) {
        // For edit: delete old order and create new one with same order number (to regenerate tasks)
        await deleteOrder.mutateAsync(editingOrder.id);
        createdOrder = await createOrder.mutateAsync(orderData);
        showToast('success', 'Order updated successfully!', {
          label: 'View Order →',
          onClick: () => setViewingOrder(createdOrder),
        });
      } else {
        createdOrder = await createOrder.mutateAsync(orderData);
        showToast('success', 'Order created successfully!', {
          label: 'View Order →',
          onClick: () => setViewingOrder(createdOrder),
        });
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

  const handleOpenCloneOrder = (order: Order) => {
    setCloningOrder(order);
    setCloneDateOffset(7);
    setCloneError(null);
  };

  const handleCloseCloneOrder = () => {
    setCloningOrder(null);
    setCloneDateOffset(7);
    setCloneError(null);
  };

  const handleSubmitClone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloneError(null);

    if (!cloningOrder) return;

    try {
      await cloneOrder.mutateAsync({
        orderId: cloningOrder.id,
        harvestDateOffset: cloneDateOffset,
      });
      handleCloseCloneOrder();
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : 'Failed to clone order');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Growth stage calculation for an individual order item
  const getItemGrowthStage = (itemId: string): { label: string; color: string } => {
    // Get tasks for this specific item
    const itemTasks = tasks?.filter((t) => t.orderItemId === itemId) || [];

    if (itemTasks.length === 0) {
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-700' };
    }

    // Collect task info by type
    const tasksByType: Record<string, { completed: boolean; dueDate: Date | null }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    itemTasks.forEach((task) => {
      tasksByType[task.type] = {
        completed: task.status === 'COMPLETED',
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      };
    });

    // Check each stage in order
    const soakTask = tasksByType['SOAK'];
    const seedTask = tasksByType['SEED'];
    const lightTask = tasksByType['MOVE_TO_LIGHT'];
    const harvestTask = tasksByType['HARVESTING'];

    // If harvest is complete, we're done
    if (harvestTask?.completed) {
      return { label: 'Harvested', color: 'bg-emerald-100 text-emerald-800' };
    }

    // If light stage is complete, we're in growing phase
    if (lightTask?.completed && !harvestTask?.completed) {
      return { label: 'Growing', color: 'bg-amber-100 text-amber-800' };
    }

    // If seed is complete, we're in germination
    if (seedTask?.completed && !lightTask?.completed) {
      return { label: 'Germination', color: 'bg-indigo-100 text-indigo-800' };
    }

    // If soak is complete (or no soak task exists), check if we're seeding
    const noSoakNeeded = !soakTask;
    const soakDone = soakTask?.completed;
    if ((noSoakNeeded || soakDone) && !seedTask?.completed) {
      // Check if seed due date has arrived
      if (seedTask?.dueDate && seedTask.dueDate <= today) {
        return { label: 'Seeding', color: 'bg-emerald-100 text-emerald-700' };
      }
    }

    // If there's a soak task that isn't complete
    if (soakTask && !soakTask.completed) {
      // Check if soak due date has arrived
      if (soakTask.dueDate && soakTask.dueDate <= today) {
        return { label: 'Soaking', color: 'bg-blue-100 text-blue-800' };
      }
    }

    // All due dates are in the future - not started yet
    return { label: 'Not Started', color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Planning</h1>
          <p className="text-muted-foreground">Add and manage orders</p>
        </div>
        <button
          onClick={handleOpenCreateOrder}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          data-tutorial="create-order"
        >
          Create Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Active Orders</p>
          <p className="text-2xl font-bold">{activeOrders.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Active Schedules</p>
          <p className="text-2xl font-bold">{activeSchedules.length}</p>
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
          onClick={() => setViewMode('recurring')}
          className={`px-4 py-2 -mb-px ${viewMode === 'recurring' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
        >
          Recurring
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
                      <h3 className="font-semibold">{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOpenCloneOrder(order)}
                        className="text-sm text-primary hover:underline"
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setViewingOrder(order as OrderWithItems)}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        View
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
                    {(order as { items?: Array<{ id: string; quantityOz: number; traysNeeded: number; harvestDate: Date; product?: { name: string } }> }).items?.map((item) => {
                      const itemStage = getItemGrowthStage(item.id);
                      return (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{item.product?.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${itemStage.color}`}>
                              {itemStage.label}
                            </span>
                            <span className="text-muted-foreground">{item.quantityOz} oz</span>
                            <span className="text-muted-foreground">{item.traysNeeded} trays</span>
                          </div>
                          <div className="text-muted-foreground">
                            Harvest: {formatDate(item.harvestDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recurring Orders Tab */}
      {viewMode === 'recurring' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recurring Order Schedules</h2>
            <button
              onClick={() => {
                setRecurringName('');
                setScheduleType('FIXED_DAY');
                setDaysOfWeek([]);
                setIntervalDays('7');
                setRecurringItems([{ ...emptyRecurringItem }]);
                setRecurringError(null);
                setShowRecurringModal(true);
              }}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              + Create Schedule
            </button>
          </div>

          {schedulesLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading schedules...</div>
          ) : recurringSchedules?.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold">No recurring schedules</h3>
              <p className="text-muted-foreground mb-4">Create recurring schedules to automatically generate orders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringSchedules?.map((schedule) => (
                <div key={schedule.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{schedule.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${schedule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {schedule.scheduleDescription}
                        {schedule.customer && ` • ${schedule.customer.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            await generateRecurringOrder.mutateAsync({ scheduleId: schedule.id });
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Failed to generate order');
                          }
                        }}
                        className="text-sm text-primary hover:underline"
                        disabled={generateRecurringOrder.isPending}
                      >
                        Generate Order
                      </button>
                      <button
                        onClick={async () => {
                          await updateRecurringSchedule.mutateAsync({
                            scheduleId: schedule.id,
                            data: { isActive: !schedule.isActive },
                          });
                        }}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {schedule.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this recurring schedule?')) return;
                          await deleteRecurringSchedule.mutateAsync(schedule.id);
                        }}
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {schedule.items.map((item) => (
                      <span key={item.id} className="text-xs bg-muted px-2 py-1 rounded">
                        {item.product.name}: {item.quantityOz}oz
                      </span>
                    ))}
                  </div>
                  {schedule.nextHarvestDate && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Next: {formatDate(schedule.nextHarvestDate)}
                    </div>
                  )}
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
                    const productSkus = getSkusForProduct(item.productId);
                    const selectedSku = getSkuById(item.skuId);
                    const itemOz = calculateItemOz(item);
                    const selectedProduct = getProductById(item.productId);
                    const blendPreview = selectedProduct?.isBlend ? calculateBlendPreview(item) : null;
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-muted/30">
                        {/* Row 1: Variety and SKU selection */}
                        <div className="grid grid-cols-12 gap-3 mb-3">
                          <div className="col-span-4">
                            <label className="block text-xs text-muted-foreground mb-1">Variety / Mix</label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                // Reset SKU when variety changes - combine both in one update
                                handleItemChange(index, 'productId', e.target.value, { skuId: '' });
                              }}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                              <option value="">Select variety or mix...</option>
                              {readyProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.isBlend ? ' (Mix)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-4">
                            <label className="block text-xs text-muted-foreground mb-1">SKU / Package</label>
                            <select
                              value={item.skuId}
                              onChange={(e) => handleItemChange(index, 'skuId', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              disabled={!item.productId || productSkus.length === 0}
                            >
                              <option value="">Select SKU...</option>
                              {productSkus.map((s) => (
                                <option key={s.id} value={s.id} className={!s.isAvailable ? 'text-muted-foreground' : ''}>
                                  {s.name} ({s.weightOz}oz) - ${(s.price / 100).toFixed(2)}
                                  {!s.isAvailable && ' (Unavailable)'}
                                </option>
                              ))}
                            </select>
                            {item.productId && productSkus.length === 0 && (
                              <p className="text-xs text-amber-600 mt-1">
                                No SKUs found. Create SKUs for this variety in Store → SKU Management.
                              </p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              placeholder="e.g., 10"
                              disabled={!item.skuId}
                            />
                          </div>
                          <div className="col-span-2">
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

                        {/* Row 2: Harvest date and calculated info */}
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-3">
                            <label className="block text-xs text-muted-foreground mb-1">Harvest Date</label>
                            <input
                              type="date"
                              value={item.harvestDate}
                              onChange={(e) => handleItemChange(index, 'harvestDate', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            />
                          </div>
                          {selectedSku && item.quantity && (
                            <>
                              <div className="col-span-2 text-center">
                                <div className="text-xs text-muted-foreground mb-1">Total Oz</div>
                                <div className="font-medium text-primary">{itemOz.toFixed(1)} oz</div>
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-xs text-muted-foreground mb-1">Trays</div>
                                <div className="font-medium">{calculateItemTrays(item)}</div>
                              </div>
                            </>
                          )}
                          {preview && (
                            <>
                              {preview.schedule.requiresSoaking && (
                                <div className="col-span-2 text-center">
                                  <div className="text-xs text-muted-foreground mb-1">Soak</div>
                                  <div className="font-medium text-sm">{formatDate(preview.schedule.soakDate)}</div>
                                </div>
                              )}
                              <div className="col-span-2 text-center">
                                <div className="text-xs text-muted-foreground mb-1">Seed</div>
                                <div className={`font-medium text-sm ${preview.warning ? 'text-amber-600' : ''}`}>
                                  {formatDate(preview.schedule.seedDate)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Warning for past dates */}
                        {preview?.warning && (
                          <div className="mt-3 p-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-200 rounded-md">
                            ⚠️ {preview.warning}
                          </div>
                        )}

                        {preview?.error && (
                          <div className="mt-3 text-sm text-destructive">
                            {preview.error}
                          </div>
                        )}

                        {/* Blend/Mix Ingredient Breakdown */}
                        {blendPreview && (
                          <div className="mt-4 p-3 bg-card border rounded-lg">
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <span className="text-primary">Mix Ingredients Breakdown</span>
                              <span className="text-xs text-muted-foreground">
                                (Total: {blendPreview.ingredients.reduce((sum, ing) => sum + ing.traysNeeded, 0)} trays)
                              </span>
                            </div>
                            <div className="space-y-2">
                              {blendPreview.ingredients.map((ing, ingIdx) => (
                                <div
                                  key={ing.productId}
                                  className="grid grid-cols-12 gap-2 text-xs py-1.5 border-b last:border-b-0"
                                >
                                  <div className="col-span-4 flex items-center gap-1">
                                    <span className="text-muted-foreground">
                                      {ingIdx === blendPreview.ingredients.length - 1 ? '└─' : '├─'}
                                    </span>
                                    <span className="font-medium">{ing.productName}</span>
                                    <span className="text-muted-foreground">({ing.ratioPercent}%)</span>
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <span className="text-muted-foreground">Oz: </span>
                                    <span className="font-medium">{ing.targetOz.toFixed(1)}</span>
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <span className="text-muted-foreground">Trays: </span>
                                    <span className="font-medium">{ing.traysNeeded}</span>
                                  </div>
                                  {ing.requiresSoaking && (
                                    <div className="col-span-2 text-center">
                                      <span className="text-muted-foreground">Soak: </span>
                                      <span>{formatDate(ing.soakDate)}</span>
                                    </div>
                                  )}
                                  <div className={`${ing.requiresSoaking ? 'col-span-2' : 'col-span-4'} text-center`}>
                                    <span className="text-muted-foreground">Seed: </span>
                                    <span>{formatDate(ing.seedDate)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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

                {/* Order Totals */}
                {orderItems.some((item) => item.skuId && item.quantity) && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Order Totals:</span>
                      <div className="flex gap-6">
                        <span>
                          <span className="text-muted-foreground">Total Oz: </span>
                          <span className="font-semibold">
                            {orderItems.reduce((sum, item) => sum + calculateItemOz(item), 0).toFixed(1)} oz
                          </span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Total Trays: </span>
                          <span className="font-semibold">
                            {orderItems.reduce((sum, item) => sum + calculateItemTrays(item), 0)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Past date acknowledgment */}
              {hasPastDateWarning && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pastDateAcknowledged}
                      onChange={(e) => setPastDateAcknowledged(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-medium text-amber-800 dark:text-amber-200">
                        Acknowledge Past Date Order
                      </span>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        I understand this order has a harvest date in the past or requires seeding/soaking dates that have already passed.
                        This is typically used for recording completed orders that weren't entered in the system.
                      </p>
                    </div>
                  </label>
                </div>
              )}

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

      {/* Clone Order Modal */}
      {cloningOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Clone Order</h2>
              <button
                onClick={handleCloseCloneOrder}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitClone} className="p-6 space-y-4">
              {cloneError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {cloneError}
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Original Order:</span>
                  <span className="font-medium">{cloningOrder.orderNumber}</span>
                </div>
                {cloningOrder.customer && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Customer:</span>
                    <span className="font-medium">{cloningOrder.customer}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Items:</span>
                  <span className="font-medium">{(cloningOrder as { items?: unknown[] }).items?.length || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Move Harvest Dates Forward By
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={cloneDateOffset}
                    onChange={(e) => setCloneDateOffset(parseInt(e.target.value) || 7)}
                    className="w-24 px-3 py-2 border rounded-md bg-background text-center"
                  />
                  <span className="text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  All production dates (soak, seed, light, harvest) will be recalculated based on this offset.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 rounded-md p-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>A new order will be created with new tasks. The original order remains unchanged.</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseCloneOrder}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloneOrder.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {cloneOrder.isPending ? 'Cloning...' : 'Clone Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Recurring Schedule Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Create Recurring Schedule</h2>
              <button
                onClick={() => setShowRecurringModal(false)}
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
                setRecurringError(null);

                const validItems = recurringItems.filter((item) => item.productId && item.quantityOz);
                if (validItems.length === 0) {
                  setRecurringError('At least one item is required');
                  return;
                }

                if (scheduleType === 'FIXED_DAY' && daysOfWeek.length === 0) {
                  setRecurringError('Select at least one day of the week');
                  return;
                }

                const scheduleData: CreateRecurringOrderSchedule = {
                  name: recurringName,
                  scheduleType,
                  daysOfWeek: scheduleType === 'FIXED_DAY' ? daysOfWeek : undefined,
                  intervalDays: scheduleType === 'INTERVAL' ? parseInt(intervalDays) : undefined,
                  startDate: new Date(),
                  leadTimeDays: 28, // Generate orders 4 weeks ahead
                  items: validItems.map((item) => ({
                    productId: item.productId,
                    quantityOz: parseFloat(item.quantityOz),
                    overagePercent: parseFloat(item.overagePercent) || 10,
                  })),
                };

                try {
                  await createRecurringSchedule.mutateAsync(scheduleData);
                  setShowRecurringModal(false);
                } catch (err) {
                  setRecurringError(err instanceof Error ? err.message : 'Failed to create schedule');
                }
              }}
              className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
            >
              {recurringError && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                  {recurringError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={recurringName}
                  onChange={(e) => setRecurringName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., Weekly Restaurant Order"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Schedule Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="scheduleType"
                      value="FIXED_DAY"
                      checked={scheduleType === 'FIXED_DAY'}
                      onChange={() => setScheduleType('FIXED_DAY')}
                    />
                    <span>Fixed Days of Week</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="scheduleType"
                      value="INTERVAL"
                      checked={scheduleType === 'INTERVAL'}
                      onChange={() => setScheduleType('INTERVAL')}
                    />
                    <span>Every N Days</span>
                  </label>
                </div>
              </div>

              {scheduleType === 'FIXED_DAY' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (daysOfWeek.includes(day)) {
                            setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
                          } else {
                            setDaysOfWeek([...daysOfWeek, day]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-md border ${
                          daysOfWeek.includes(day)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        {getShortDayName(day)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {scheduleType === 'INTERVAL' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Interval (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    className="w-24 px-3 py-2 border rounded-md bg-background"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Items</label>
                  <button
                    type="button"
                    onClick={() => setRecurringItems([...recurringItems, { ...emptyRecurringItem }])}
                    className="text-sm text-primary hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {recurringItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">Variety / Mix</label>
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const updated = [...recurringItems];
                            updated[index] = { ...item, productId: e.target.value };
                            setRecurringItems(updated);
                          }}
                          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        >
                          <option value="">Select...</option>
                          {readyProducts.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}{p.isBlend ? ' (Mix)' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-muted-foreground mb-1">Qty (oz)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.quantityOz}
                          onChange={(e) => {
                            const updated = [...recurringItems];
                            updated[index] = { ...item, quantityOz: e.target.value };
                            setRecurringItems(updated);
                          }}
                          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        />
                      </div>
                      {recurringItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRecurringItems(recurringItems.filter((_, i) => i !== index))}
                          className="text-destructive hover:underline text-sm pb-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRecurringSchedule.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createRecurringSchedule.isPending ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order View Modal */}
      {viewingOrder && (
        <OrderViewModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}
    </div>
  );
}
