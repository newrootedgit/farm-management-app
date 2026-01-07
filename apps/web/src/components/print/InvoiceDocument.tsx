import { PrintLayout, PrintSection, PrintRow, PrintTable } from './PrintLayout';
import type { OrderWithItems } from '@farm/shared';

interface InvoiceDocumentProps {
  order: OrderWithItems;
  farmName?: string;
  farmLogo?: string;
  farmAddress?: string;
  farmPhone?: string;
  farmEmail?: string;
  invoiceNumber?: string;
  dueDate?: Date;
  paymentTerms?: string;
}

export function InvoiceDocument({
  order,
  farmName = 'Farm',
  farmLogo,
  farmAddress,
  farmPhone,
  farmEmail,
  invoiceNumber,
  dueDate,
  paymentTerms = 'Due on Receipt',
}: InvoiceDocumentProps) {
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

  // Calculate totals
  const totalOz = order.items.reduce((sum, item) => sum + item.quantityOz, 0);
  const displayInvoiceNumber = invoiceNumber || `INV-${order.orderNumber}`;
  const displayDueDate = dueDate || new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000); // Default Net 15

  return (
    <PrintLayout
      title="INVOICE"
      farmName={farmName}
      farmLogo={farmLogo}
    >
      {/* Invoice Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <PrintSection title="Bill To">
            <p style={{ fontWeight: 500, fontSize: '16px', margin: '0 0 4px 0' }}>
              {order.customer || 'Customer'}
            </p>
            {/* Customer address would go here if available */}
          </PrintSection>
        </div>
        <div style={{ textAlign: 'right' }}>
          <PrintRow label="Invoice #:" value={displayInvoiceNumber} />
          <PrintRow label="Order #:" value={order.orderNumber} />
          <PrintRow label="Date:" value={formatDate(order.createdAt)} />
          <PrintRow label="Due Date:" value={formatDate(displayDueDate)} />
          <PrintRow label="Terms:" value={paymentTerms} />
        </div>
      </div>

      {/* Farm Info */}
      {(farmAddress || farmPhone || farmEmail) && (
        <PrintSection title="From">
          <p style={{ margin: 0 }}>{farmName}</p>
          {farmAddress && <p style={{ margin: '2px 0', color: '#666' }}>{farmAddress}</p>}
          {farmPhone && <p style={{ margin: '2px 0', color: '#666' }}>{farmPhone}</p>}
          {farmEmail && <p style={{ margin: '2px 0', color: '#666' }}>{farmEmail}</p>}
        </PrintSection>
      )}

      {/* Line Items */}
      <PrintSection title="Items">
        <PrintTable headers={['Product', 'Harvest Date', 'Quantity', 'Unit Price', 'Total']}>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.product.name}</td>
              <td>{formatDate(item.harvestDate)}</td>
              <td className="text-right">{formatOz(item.quantityOz)}</td>
              <td className="text-right">—</td>
              <td className="text-right">—</td>
            </tr>
          ))}
        </PrintTable>
      </PrintSection>

      {/* Totals */}
      <div style={{ marginTop: '24px', marginLeft: 'auto', width: '250px' }}>
        <div className="print-row" style={{ borderTop: '1px solid #ddd', paddingTop: '8px' }}>
          <span className="print-label">Total Quantity:</span>
          <span className="print-value">{formatOz(totalOz)}</span>
        </div>
        <div className="print-row">
          <span className="print-label">Subtotal:</span>
          <span className="print-value">—</span>
        </div>
        <div className="print-row">
          <span className="print-label">Tax:</span>
          <span className="print-value">—</span>
        </div>
        <div className="print-row print-total-row">
          <span className="print-label">TOTAL DUE:</span>
          <span className="print-value">—</span>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <PrintSection title="Notes">
          <p style={{ margin: 0, color: '#666' }}>{order.notes}</p>
        </PrintSection>
      )}

      {/* Payment Info */}
      <div style={{ marginTop: '32px', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>Payment Information</p>
        <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '12px' }}>
          Please make payment by {formatDate(displayDueDate)}.
          Contact us if you have any questions about this invoice.
        </p>
      </div>
    </PrintLayout>
  );
}

// Simple version for quick printing without all details
export function SimpleInvoice({ order, farmName }: { order: OrderWithItems; farmName?: string }) {
  return (
    <InvoiceDocument
      order={order}
      farmName={farmName}
    />
  );
}
