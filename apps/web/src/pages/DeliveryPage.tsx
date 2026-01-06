import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import {
  useDeliveryRoutes,
  useDrivers,
  useCreateDeliveryRoute,
  useDeleteDeliveryRoute,
  useStartRoute,
  useCompleteRoute,
  useOrdersReadyForDelivery,
  useAddOrderToRoute,
  useRemoveOrderFromRoute,
} from '@/lib/api-client';
import type { RouteStatus } from '@farm/shared';

// Status labels and colors
const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const ROUTE_STATUS_COLORS: Record<RouteStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const FULFILLMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  READY_FOR_PICKUP: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-green-100 text-green-800',
  PICKED_UP: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export default function DeliveryPage() {
  const { currentFarmId } = useFarmStore();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // Data hooks
  const { data: routes, isLoading: routesLoading } = useDeliveryRoutes(currentFarmId ?? undefined, {
    date: selectedDate,
  });
  const { data: drivers } = useDrivers(currentFarmId ?? undefined);
  const { data: readyOrders } = useOrdersReadyForDelivery(currentFarmId ?? undefined);

  // Mutations
  const createRoute = useCreateDeliveryRoute(currentFarmId ?? '');
  const deleteRoute = useDeleteDeliveryRoute(currentFarmId ?? '');
  const startRoute = useStartRoute(currentFarmId ?? '');
  const completeRoute = useCompleteRoute(currentFarmId ?? '');
  const addOrderToRoute = useAddOrderToRoute(currentFarmId ?? '');
  const removeOrderFromRoute = useRemoveOrderFromRoute(currentFarmId ?? '');

  // Create route form state
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDriver, setNewRouteDriver] = useState('');

  const handleCreateRoute = async () => {
    if (!newRouteName.trim()) return;

    try {
      await createRoute.mutateAsync({
        name: newRouteName.trim(),
        date: new Date(selectedDate),
        driverId: newRouteDriver || undefined,
      });
      setShowCreateModal(false);
      setNewRouteName('');
      setNewRouteDriver('');
    } catch (error) {
      console.error('Failed to create route:', error);
    }
  };

  const handleStartRoute = async (routeId: string) => {
    try {
      await startRoute.mutateAsync(routeId);
    } catch (error) {
      console.error('Failed to start route:', error);
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      await completeRoute.mutateAsync({ routeId });
    } catch (error) {
      console.error('Failed to complete route:', error);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      await deleteRoute.mutateAsync(routeId);
    } catch (error) {
      console.error('Failed to delete route:', error);
    }
  };

  const handleAddOrder = async (orderId: string) => {
    if (!selectedRoute) return;

    try {
      await addOrderToRoute.mutateAsync({
        routeId: selectedRoute,
        orderId,
      });
    } catch (error) {
      console.error('Failed to add order to route:', error);
    }
  };

  const handleRemoveOrder = async (routeId: string, orderId: string) => {
    try {
      await removeOrderFromRoute.mutateAsync({ routeId, orderId });
    } catch (error) {
      console.error('Failed to remove order from route:', error);
    }
  };

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage deliveries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery Routes</h1>
          <p className="text-muted-foreground">Plan and manage delivery routes for your drivers</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Create Route
          </button>
        </div>
      </div>

      {/* Routes List */}
      {routesLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading routes...</div>
      ) : !routes || routes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <div className="text-4xl mb-4">🚚</div>
          <h3 className="text-lg font-medium mb-2">No Routes for This Date</h3>
          <p className="text-muted-foreground mb-4">Create a delivery route to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Create Route
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <div key={route.id} className="border rounded-lg bg-card overflow-hidden">
              {/* Route Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{route.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {route.driver
                        ? `${route.driver.firstName} ${route.driver.lastName}`
                        : 'No driver assigned'}
                      {route._count && ` · ${route._count.orders} stops`}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ROUTE_STATUS_COLORS[route.status]
                    }`}
                  >
                    {ROUTE_STATUS_LABELS[route.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {route.status === 'PLANNED' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRoute(route.id);
                          setShowAddOrderModal(true);
                        }}
                        className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
                      >
                        Add Stop
                      </button>
                      <button
                        onClick={() => handleStartRoute(route.id)}
                        disabled={startRoute.isPending}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        Start Route
                      </button>
                      <button
                        onClick={() => handleDeleteRoute(route.id)}
                        disabled={deleteRoute.isPending}
                        className="px-3 py-1.5 text-sm text-destructive border border-destructive/50 rounded-md hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {route.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteRoute(route.id)}
                      disabled={completeRoute.isPending}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Complete Route
                    </button>
                  )}
                </div>
              </div>

              {/* Route Stops */}
              {route.orders && route.orders.length > 0 ? (
                <div className="divide-y">
                  {route.orders.map((order, index) => (
                    <div
                      key={order.id}
                      className="p-4 flex items-center justify-between hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {order.customerName || 'Unknown Customer'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.deliveryAddress || 'No address'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Order #{order.orderNumber}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            FULFILLMENT_STATUS_COLORS[order.fulfillmentStatus] || 'bg-gray-100'
                          }`}
                        >
                          {order.fulfillmentStatus.replace(/_/g, ' ')}
                        </span>
                        {route.status === 'PLANNED' && (
                          <button
                            onClick={() => handleRemoveOrder(route.id, order.id)}
                            className="text-destructive hover:underline text-sm"
                          >
                            Remove
                          </button>
                        )}
                        {order.deliveryAddress && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Navigate
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No stops added to this route yet
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Orders Ready for Delivery */}
      {readyOrders && readyOrders.length > 0 && (
        <div className="border rounded-lg bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Orders Ready for Delivery</h3>
            <p className="text-sm text-muted-foreground">
              These orders are ready to be added to a route
            </p>
          </div>
          <div className="divide-y">
            {readyOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{order.customerName || 'Unknown Customer'}</div>
                  <div className="text-sm text-muted-foreground">
                    Order #{order.orderNumber} · ${(order.totalCents / 100).toFixed(2)}
                  </div>
                  {order.deliveryDate && (
                    <div className="text-xs text-muted-foreground">
                      Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.customer?.addressLine1}, {order.customer?.city}
                </div>
              </div>
            ))}
          </div>
          {readyOrders.length > 5 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t">
              +{readyOrders.length - 5} more orders ready
            </div>
          )}
        </div>
      )}

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Delivery Route</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Route Name</label>
                <input
                  type="text"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="e.g., Morning Route, Downtown Deliveries"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Driver (Optional)</label>
                <select
                  value={newRouteDriver}
                  onChange={(e) => setNewRouteDriver(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Select a driver...</option>
                  {drivers?.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </option>
                  ))}
                </select>
                {(!drivers || drivers.length === 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No drivers found. Add employees with the DRIVER position.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoute}
                disabled={!newRouteName.trim() || createRoute.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {createRoute.isPending ? 'Creating...' : 'Create Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddOrderModal && selectedRoute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Add Order to Route</h2>
            {readyOrders && readyOrders.length > 0 ? (
              <div className="space-y-2">
                {readyOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 border rounded-md flex items-center justify-between hover:bg-accent/50"
                  >
                    <div>
                      <div className="font-medium">{order.customerName || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        Order #{order.orderNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.customer?.addressLine1}, {order.customer?.city}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddOrder(order.id)}
                      disabled={addOrderToRoute.isPending}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No orders ready for delivery
              </p>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddOrderModal(false);
                  setSelectedRoute(null);
                }}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
