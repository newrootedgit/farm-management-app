import { useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText, Package } from 'lucide-react';

interface PrintButtonProps {
  children: ReactNode;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  documentTitle?: string;
}

export function PrintButton({
  children,
  label = 'Print',
  variant = 'outline',
  size = 'md',
  documentTitle = 'Document',
}: PrintButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${documentTitle}</title>
            <style>
              body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
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
    }
    setShowPreview(false);
  };

  const buttonClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border hover:bg-accent',
    ghost: 'hover:bg-accent',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors ${buttonClasses[variant]} ${sizeClasses[size]}`}
      >
        <Printer className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {label}
      </button>

      {/* Preview Modal */}
      {showPreview &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowPreview(false)}
            />

            {/* Modal */}
            <div className="relative bg-background rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="font-semibold">Print Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1.5 hover:bg-accent rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-auto p-4 bg-muted/30">
                <div
                  ref={printRef}
                  className="print-container bg-white mx-auto"
                  style={{ maxWidth: '800px' }}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Quick print buttons for common documents
interface QuickPrintProps {
  onPrintInvoice?: () => void;
  onPrintPackList?: () => void;
}

export function QuickPrintButtons({ onPrintInvoice, onPrintPackList }: QuickPrintProps) {
  return (
    <div className="flex items-center gap-2">
      {onPrintInvoice && (
        <button
          onClick={onPrintInvoice}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border rounded-md hover:bg-accent"
          title="Print Invoice"
        >
          <FileText className="w-3 h-3" />
          Invoice
        </button>
      )}
      {onPrintPackList && (
        <button
          onClick={onPrintPackList}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border rounded-md hover:bg-accent"
          title="Print Pack List"
        >
          <Package className="w-3 h-3" />
          Pack List
        </button>
      )}
    </div>
  );
}

// Hook for managing print state
export function usePrint() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printContent, setPrintContent] = useState<ReactNode | null>(null);

  const print = (content: ReactNode) => {
    setPrintContent(content);
    setIsPrinting(true);
  };

  const closePrint = () => {
    setIsPrinting(false);
    setPrintContent(null);
  };

  return {
    isPrinting,
    printContent,
    print,
    closePrint,
  };
}
