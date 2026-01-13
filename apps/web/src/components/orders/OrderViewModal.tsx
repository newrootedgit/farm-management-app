import { useState } from 'react';
import { XMarkIcon, PrinterIcon, ClipboardDocumentListIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { OrderWithItems } from '@farm/shared';
import { InvoiceDocument, PackListDocument } from '@/components/print';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface OrderViewModalProps {
  order: OrderWithItems;
  onClose: () => void;
  farmName?: string;
}

export function OrderViewModal({ order, onClose, farmName }: OrderViewModalProps) {
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [printType, setPrintType] = useState<'invoice' | 'packlist' | null>(null);

  // Close on ESC key
  useEscapeKey(true, onClose);

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

  const totalOz = order.items.reduce((sum, item) => sum + item.quantityOz, 0);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    READY: 'bg-green-100 text-green-800',
    DELIVERED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const handleCopyToClipboard = () => {
    const text = `Order #${order.orderNumber}
${order.customer ? `Customer: ${order.customer}\n` : ''}Status: ${order.status}
Created: ${formatDate(order.createdAt)}

Items:
${order.items.map((item) => `- ${item.product.name}: ${formatOz(item.quantityOz)} (Harvest: ${formatDate(item.harvestDate)})`).join('\n')}

Total: ${formatOz(totalOz)}
${order.notes ? `\nNotes: ${order.notes}` : ''}`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Order #{order.orderNumber}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                  {order.status}
                </span>
                <span className="text-sm text-gray-500">
                  Created {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Copy to clipboard"
              >
                <ClipboardDocumentListIcon className="h-5 w-5" />
              </button>

              {/* Print Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowPrintMenu(!showPrintMenu)}
                  className="flex items-center gap-1 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Print options"
                >
                  <PrinterIcon className="h-5 w-5" />
                  <ChevronDownIcon className="h-3 w-3" />
                </button>
                {showPrintMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPrintMenu(false)} />
                    <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg py-1 z-20">
                      <button
                        onClick={() => {
                          setPrintType('invoice');
                          setShowPrintMenu(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                      >
                        Print Invoice
                      </button>
                      <button
                        onClick={() => {
                          setPrintType('packlist');
                          setShowPrintMenu(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                      >
                        Print Pack List
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Customer */}
            {order.customer && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Customer</label>
                <p className="text-gray-900 font-medium">{order.customer}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                Order Items ({order.items.length})
              </label>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {order.items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        Harvest: {formatDate(item.harvestDate)}
                        {item.actualYieldOz && (
                          <span className="ml-2 text-green-600">
                            (Actual: {formatOz(item.actualYieldOz)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatOz(item.quantityOz)}</p>
                      <p className="text-xs text-gray-500">
                        {item.traysNeeded} tray{item.traysNeeded !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-700">Total Order Weight</span>
              <span className="text-lg font-bold text-gray-900">{formatOz(totalOz)}</span>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="pt-2 border-t border-gray-200">
                <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
                <p className="text-gray-700 mt-1">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {printType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPrintType(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-semibold">
                {printType === 'invoice' ? 'Invoice Preview' : 'Pack List Preview'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const content = document.getElementById('print-preview-content');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>${printType === 'invoice' ? 'Invoice' : 'Pack List'} - Order ${order.orderNumber}</title>
                          <style>
                            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                          </style>
                        </head>
                        <body>
                          ${content?.innerHTML || ''}
                        </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 250);
                    }
                    setPrintType(null);
                  }}
                  className="px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  Print
                </button>
                <button
                  onClick={() => setPrintType(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-md"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              <div id="print-preview-content" className="bg-white mx-auto" style={{ maxWidth: '800px' }}>
                {printType === 'invoice' ? (
                  <InvoiceDocument order={order} farmName={farmName} />
                ) : (
                  <PackListDocument order={order} farmName={farmName} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
