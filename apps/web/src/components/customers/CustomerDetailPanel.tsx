import { useMemo } from 'react';
import { X, RefreshCw, Package, Calendar, TrendingUp, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { useOrders } from '@/lib/api-client';
import { formatPaymentTerms, formatCustomerType } from '@farm/shared';
import type { Customer, CustomerTag, OrderWithItems } from '@farm/shared';

interface CustomerDetailPanelProps {
  customer: Customer & { tags: CustomerTag[] };
  farmId: string;
  onClose: () => void;
  onReorder?: (order: OrderWithItems) => void;
  onCreateOrder?: (customerId: string, customerName: string) => void;
}

export function CustomerDetailPanel({
  customer,
  farmId,
  onClose,
  onReorder,
  onCreateOrder,
}: CustomerDetailPanelProps) {
  // Use useOrders with customer filter to get orders with items
  const { data: allOrders, isLoading: ordersLoading } = useOrders(farmId, { customer: customer.name });
  const orders = allOrders?.filter(o => o.customer === customer.name);

  // Calculate customer stats
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        lastOrderDate: null,
        daysSinceLastOrder: null,
      };
    }

    const totalRevenue = orders.reduce((sum, order) => {
      // Sum up order item values (assuming we track totals somewhere)
      // For now, count total oz as a proxy
      const orderOz = order.items?.reduce((ozSum, item) => ozSum + (item.quantityOz || 0), 0) || 0;
      return sum + orderOz;
    }, 0);

    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const lastOrder = sortedOrders[0];
    const lastOrderDate = lastOrder ? new Date(lastOrder.createdAt) : null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      totalOrders: orders.length,
      totalRevenue,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      lastOrderDate,
      daysSinceLastOrder,
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatOz = (oz: number) => {
    if (oz >= 16) {
      const lbs = oz / 16;
      return `${lbs.toFixed(1)} lb`;
    }
    return `${oz} oz`;
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    READY: 'bg-green-100 text-green-800',
    DELIVERED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          {customer.companyName && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              {customer.companyName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
              {formatCustomerType(customer.customerType)}
            </span>
            {customer.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg -mr-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Info */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Contact</h3>
          <div className="space-y-2 text-sm">
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-4 h-4" />
                {customer.email}
              </a>
            )}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" />
                {customer.phone}
              </a>
            )}
            {(customer.addressLine1 || customer.city) && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5" />
                <div>
                  {customer.addressLine1 && <p>{customer.addressLine1}</p>}
                  {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                  {(customer.city || customer.state || customer.postalCode) && (
                    <p>
                      {[customer.city, customer.state, customer.postalCode].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-1 bg-blue-100 text-blue-600 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <p className="text-lg font-semibold">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-1 bg-green-100 text-green-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-lg font-semibold">{formatOz(stats.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-1 bg-purple-100 text-purple-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-lg font-semibold">
                {stats.daysSinceLastOrder !== null ? `${stats.daysSinceLastOrder}d` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Last Order</p>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Terms</h3>
          <p className="font-medium">{formatPaymentTerms(customer.paymentTerms)}</p>
          {customer.creditLimit && (
            <p className="text-sm text-muted-foreground mt-1">
              Credit Limit: ${customer.creditLimit.toLocaleString()}
            </p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Recent Orders</h3>
          </div>

          {ordersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const orderOz = order.items?.reduce((sum, item) => sum + (item.quantityOz || 0), 0) || 0;
                return (
                  <div
                    key={order.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatOz(orderOz)}
                          </span>
                        </div>
                      </div>
                      {onReorder && (
                        <button
                          onClick={() => onReorder(order)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reorder
                        </button>
                      )}
                    </div>

                    {/* Order Items Preview */}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        {order.items.slice(0, 3).map((item, i) => (
                          <span key={item.id}>
                            {i > 0 && ', '}
                            {item.product?.name || 'Product'} ({formatOz(item.quantityOz)})
                          </span>
                        ))}
                        {order.items.length > 3 && ` +${order.items.length - 3} more`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        {customer.notes && (
          <div className="px-6 py-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
            <p className="text-sm">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t bg-muted/30">
        <div className="flex gap-3">
          {orders && orders.length > 5 && (
            <button className="flex-1 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted">
              View All Orders ({orders.length})
            </button>
          )}
          {onCreateOrder && (
            <button
              onClick={() => onCreateOrder(customer.id, customer.name)}
              className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Create Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Customer Stats Card (for use in lists)
interface CustomerStatsCardProps {
  customer: Customer;
  orderCount?: number;
  lastOrderDate?: Date | null;
  onClick?: () => void;
}

export function CustomerStatsCard({
  customer,
  orderCount = 0,
  lastOrderDate,
  onClick,
}: CustomerStatsCardProps) {
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all bg-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{customer.name}</h3>
          {customer.companyName && (
            <p className="text-sm text-muted-foreground">{customer.companyName}</p>
          )}
        </div>
        <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
          {formatCustomerType(customer.customerType)}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5" />
          {orderCount} orders
        </span>
        {daysSinceLastOrder !== null && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {daysSinceLastOrder === 0 ? 'Today' : `${daysSinceLastOrder}d ago`}
          </span>
        )}
      </div>
    </button>
  );
}
