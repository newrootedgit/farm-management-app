import { PrintLayout, PrintSection, PrintTable, PrintCheckbox } from './PrintLayout';
import type { OrderWithItems } from '@farm/shared';

interface PackListDocumentProps {
  order: OrderWithItems;
  farmName?: string;
  farmLogo?: string;
  deliveryMethod?: string;
  deliveryTime?: string;
}

export function PackListDocument({
  order,
  farmName = 'Farm',
  farmLogo,
  deliveryMethod,
  deliveryTime,
}: PackListDocumentProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
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

  // Get the earliest harvest date from items
  const harvestDates = order.items.map((item) => new Date(item.harvestDate));
  const packDate = harvestDates.length > 0
    ? new Date(Math.min(...harvestDates.map(d => d.getTime())))
    : new Date();

  const totalOz = order.items.reduce((sum, item) => sum + item.quantityOz, 0);

  return (
    <PrintLayout
      title="PACK LIST"
      farmName={farmName}
      farmLogo={farmLogo}
    >
      {/* Order & Customer Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '18px' }}>
            {order.customer || 'Walk-in Customer'}
          </p>
          <p style={{ margin: 0, color: '#666' }}>Order #{order.orderNumber}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0' }}>
            <span style={{ color: '#666' }}>Pack Date:</span>{' '}
            <strong>{formatDate(packDate)}</strong>
          </p>
          {deliveryMethod && (
            <p style={{ margin: '0 0 4px 0' }}>
              <span style={{ color: '#666' }}>Delivery:</span>{' '}
              <strong>{deliveryMethod}</strong>
              {deliveryTime && ` - ${deliveryTime}`}
            </p>
          )}
        </div>
      </div>

      {/* Items to Pack */}
      <PrintSection title="Items to Pack">
        <PrintTable headers={['', 'Product', 'Quantity', 'Harvest Date', 'Notes']}>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td style={{ width: '30px' }}>
                <PrintCheckbox />
              </td>
              <td style={{ fontWeight: 500 }}>{item.product.name}</td>
              <td className="text-right" style={{ fontWeight: 600 }}>
                {formatOz(item.quantityOz)}
              </td>
              <td>{formatDate(item.harvestDate)}</td>
              <td style={{ color: '#666' }}>
                {item.seedLot && `Lot: ${item.seedLot}`}
              </td>
            </tr>
          ))}
        </PrintTable>

        {/* Total */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
        }}>
          <span>Total Items: {order.items.length}</span>
          <span>Total Weight: {formatOz(totalOz)}</span>
        </div>
      </PrintSection>

      {/* Notes */}
      {order.notes && (
        <PrintSection title="Order Notes">
          <p style={{
            margin: 0,
            padding: '12px',
            background: '#fff8e1',
            border: '1px solid #ffc107',
            borderRadius: '4px',
          }}>
            {order.notes}
          </p>
        </PrintSection>
      )}

      {/* Signature Section */}
      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '2px solid #000',
        display: 'flex',
        gap: '48px',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 32px 0', color: '#666' }}>Packed by:</p>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }}></div>
          <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Name</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 32px 0', color: '#666' }}>Date/Time:</p>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }}></div>
          <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Date & Time</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 32px 0', color: '#666' }}>QC Check:</p>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }}></div>
          <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Initials</p>
        </div>
      </div>
    </PrintLayout>
  );
}

// Batch pack list for multiple orders
interface BatchPackListProps {
  orders: OrderWithItems[];
  farmName?: string;
  farmLogo?: string;
}

export function BatchPackList({ orders, farmName, farmLogo }: BatchPackListProps) {
  return (
    <div className="print-container">
      {orders.map((order, index) => (
        <div key={order.id} className={index < orders.length - 1 ? 'page-break' : ''}>
          <PackListDocument
            order={order}
            farmName={farmName}
            farmLogo={farmLogo}
          />
        </div>
      ))}
    </div>
  );
}

// Consolidated pack list grouped by product (for packing station efficiency)
interface ConsolidatedPackListProps {
  orders: OrderWithItems[];
  farmName?: string;
  farmLogo?: string;
  packDate?: Date;
}

export function ConsolidatedPackList({
  orders,
  farmName = 'Farm',
  farmLogo,
  packDate = new Date(),
}: ConsolidatedPackListProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
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

  // Group all items by product
  const productGroups = new Map<string, {
    productName: string;
    totalOz: number;
    orders: { customer: string; orderNumber: string; quantityOz: number }[];
  }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const existing = productGroups.get(item.productId);
      if (existing) {
        existing.totalOz += item.quantityOz;
        existing.orders.push({
          customer: order.customer || 'Walk-in',
          orderNumber: order.orderNumber,
          quantityOz: item.quantityOz,
        });
      } else {
        productGroups.set(item.productId, {
          productName: item.product.name,
          totalOz: item.quantityOz,
          orders: [{
            customer: order.customer || 'Walk-in',
            orderNumber: order.orderNumber,
            quantityOz: item.quantityOz,
          }],
        });
      }
    });
  });

  const grandTotalOz = Array.from(productGroups.values()).reduce(
    (sum, group) => sum + group.totalOz,
    0
  );

  return (
    <PrintLayout
      title="CONSOLIDATED PACK LIST"
      farmName={farmName}
      farmLogo={farmLogo}
    >
      {/* Summary */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: '0 0 4px 0' }}>
          <span style={{ color: '#666' }}>Pack Date:</span>{' '}
          <strong>{formatDate(packDate)}</strong>
        </p>
        <p style={{ margin: 0 }}>
          <span style={{ color: '#666' }}>Total Orders:</span>{' '}
          <strong>{orders.length}</strong>
        </p>
      </div>

      {/* Products */}
      {Array.from(productGroups.values())
        .sort((a, b) => a.productName.localeCompare(b.productName))
        .map((group) => (
          <PrintSection key={group.productName} title={group.productName}>
            <div style={{ marginBottom: '8px', fontWeight: 600 }}>
              Total needed: {formatOz(group.totalOz)}
            </div>
            <PrintTable headers={['', 'Customer', 'Order #', 'Quantity']}>
              {group.orders.map((o, i) => (
                <tr key={i}>
                  <td style={{ width: '30px' }}>
                    <PrintCheckbox />
                  </td>
                  <td>{o.customer}</td>
                  <td>#{o.orderNumber}</td>
                  <td className="text-right">{formatOz(o.quantityOz)}</td>
                </tr>
              ))}
            </PrintTable>
          </PrintSection>
        ))}

      {/* Grand Total */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f5f5f5',
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '16px',
      }}>
        Grand Total: {formatOz(grandTotalOz)} across {orders.length} orders
      </div>
    </PrintLayout>
  );
}
