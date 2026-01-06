import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentHeader, CustomerBlock, DocumentFooter, sharedStyles, formatDate, formatCurrency } from './shared.js';
import type { InvoiceData } from '@farm/shared';

const styles = StyleSheet.create({
  ...sharedStyles,
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  invoiceDetails: {
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
    width: '45%',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  invoiceLabel: {
    fontWeight: 'bold',
    color: '#0369a1',
  },
  invoiceValue: {
    textAlign: 'right',
  },
  dueDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
  },
  itemsTable: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 10,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  colProduct: {
    flex: 2,
  },
  colQuantity: {
    width: 70,
    textAlign: 'right',
  },
  colUnitPrice: {
    width: 80,
    textAlign: 'right',
  },
  colTotal: {
    width: 80,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 250,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    color: '#64748b',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1e3a5f',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  paymentTerms: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  paymentTermsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#92400e',
  },
});

interface InvoiceProps {
  data: InvoiceData;
}

export function Invoice({ data }: InvoiceProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <DocumentHeader
          farm={data.farm}
          documentType="INVOICE"
          documentNumber={data.invoiceNumber}
          date={data.invoiceDate}
        />

        {/* Title */}
        <Text style={styles.title}>INVOICE</Text>

        {/* Invoice Info and Bill To */}
        <View style={styles.invoiceInfo}>
          {/* Bill To */}
          <View style={{ width: '45%' }}>
            <CustomerBlock title="Bill To" customer={data.customer} />
          </View>

          {/* Invoice Details */}
          <View style={styles.invoiceDetails}>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Invoice #:</Text>
              <Text style={styles.invoiceValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Invoice Date:</Text>
              <Text style={styles.invoiceValue}>{formatDate(data.invoiceDate)}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Order #:</Text>
              <Text style={styles.invoiceValue}>{data.order.orderNumber}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Terms:</Text>
              <Text style={styles.invoiceValue}>{data.paymentTerms}</Text>
            </View>
            <View style={styles.dueDate}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Due Date:</Text>
                <Text style={[styles.invoiceValue, { color: '#dc2626' }]}>
                  {formatDate(data.dueDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colProduct]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>Qty (oz)</Text>
            <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}
            >
              <View style={styles.colProduct}>
                <Text style={{ fontWeight: 'bold' }}>{item.productName}</Text>
                <Text style={{ fontSize: 8, color: '#666' }}>
                  Harvested: {formatDate(item.harvestDate)}
                </Text>
              </View>
              <Text style={styles.colQuantity}>{item.quantityOz}</Text>
              <Text style={styles.colUnitPrice}>
                {item.unitPriceCents ? formatCurrency(item.unitPriceCents) : '-'}
              </Text>
              <Text style={styles.colTotal}>
                {item.lineTotalCents ? formatCurrency(item.lineTotalCents) : '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.subtotalCents)}</Text>
            </View>
            {data.taxCents > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>{formatCurrency(data.taxCents)}</Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>Total Due:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(data.totalCents)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Terms/Notes */}
        {data.footerNotes && (
          <View style={styles.paymentTerms}>
            <Text style={styles.paymentTermsTitle}>Payment Information:</Text>
            <Text>{data.footerNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <DocumentFooter farm={data.farm} />
      </Page>
    </Document>
  );
}
