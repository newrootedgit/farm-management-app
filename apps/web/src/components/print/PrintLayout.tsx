import { ReactNode } from 'react';

interface PrintLayoutProps {
  children: ReactNode;
  title?: string;
  farmName?: string;
  farmLogo?: string;
  showFooter?: boolean;
}

export function PrintLayout({
  children,
  title,
  farmName,
  farmLogo,
  showFooter = true,
}: PrintLayoutProps) {
  return (
    <div className="print-document">
      {/* Print-only styles */}
      <style>
        {`
          @media print {
            /* Hide everything except print document */
            body > *:not(.print-container) {
              display: none !important;
            }

            .print-container {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
            }

            .print-document {
              padding: 0;
              margin: 0;
              font-size: 12px;
              color: black;
              background: white;
            }

            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #000;
            }

            .print-logo {
              max-height: 60px;
              max-width: 200px;
            }

            .print-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
            }

            .print-farm-name {
              font-size: 14px;
              color: #666;
              margin-top: 4px;
            }

            .print-content {
              min-height: calc(100vh - 200px);
            }

            .print-footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #ccc;
              font-size: 10px;
              color: #666;
              text-align: center;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }

            .print-table th,
            .print-table td {
              padding: 8px 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }

            .print-table th {
              background: #f5f5f5;
              font-weight: 600;
              border-bottom: 2px solid #000;
            }

            .print-table tr:last-child td {
              border-bottom: none;
            }

            .print-section {
              margin-bottom: 24px;
            }

            .print-section-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
              padding-bottom: 4px;
              border-bottom: 1px solid #ccc;
            }

            .print-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }

            .print-label {
              color: #666;
            }

            .print-value {
              font-weight: 500;
            }

            .print-checkbox {
              display: inline-block;
              width: 14px;
              height: 14px;
              border: 1px solid #000;
              margin-right: 8px;
              vertical-align: middle;
            }

            .print-total-row {
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }

            .text-right {
              text-align: right;
            }

            .text-center {
              text-align: center;
            }

            /* Page break utilities */
            .page-break {
              page-break-after: always;
            }

            .no-break {
              page-break-inside: avoid;
            }
          }

          /* Screen preview styles */
          @media screen {
            .print-document {
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              font-size: 14px;
            }

            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #000;
            }

            .print-logo {
              max-height: 60px;
              max-width: 200px;
            }

            .print-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
            }

            .print-farm-name {
              font-size: 14px;
              color: #666;
              margin-top: 4px;
            }

            .print-footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #ccc;
              font-size: 12px;
              color: #666;
              text-align: center;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }

            .print-table th,
            .print-table td {
              padding: 8px 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }

            .print-table th {
              background: #f5f5f5;
              font-weight: 600;
              border-bottom: 2px solid #000;
            }

            .print-section {
              margin-bottom: 24px;
            }

            .print-section-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
              padding-bottom: 4px;
              border-bottom: 1px solid #ccc;
            }

            .print-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }

            .print-label {
              color: #666;
            }

            .print-value {
              font-weight: 500;
            }

            .print-checkbox {
              display: inline-block;
              width: 14px;
              height: 14px;
              border: 1px solid #000;
              margin-right: 8px;
              vertical-align: middle;
            }

            .print-total-row {
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }

            .text-right {
              text-align: right;
            }

            .text-center {
              text-align: center;
            }
          }
        `}
      </style>

      {/* Header */}
      {(title || farmName || farmLogo) && (
        <div className="print-header">
          <div>
            {title && <h1 className="print-title">{title}</h1>}
            {farmName && <p className="print-farm-name">{farmName}</p>}
          </div>
          {farmLogo && (
            <img src={farmLogo} alt="Farm Logo" className="print-logo" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="print-content">{children}</div>

      {/* Footer */}
      {showFooter && (
        <div className="print-footer">
          <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          {farmName && <p>{farmName}</p>}
        </div>
      )}
    </div>
  );
}

// Helper components for print documents
export function PrintSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="print-section no-break">
      {title && <h2 className="print-section-title">{title}</h2>}
      {children}
    </div>
  );
}

export function PrintRow({
  label,
  value,
}: {
  label: string;
  value: string | number | ReactNode;
}) {
  return (
    <div className="print-row">
      <span className="print-label">{label}</span>
      <span className="print-value">{value}</span>
    </div>
  );
}

export function PrintTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          {headers.map((header, i) => (
            <th key={i}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function PrintCheckbox({ checked = false }: { checked?: boolean }) {
  return (
    <span className="print-checkbox">
      {checked && '✓'}
    </span>
  );
}
