import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentHeader, CustomerBlock, DocumentFooter, sharedStyles, formatDate } from './shared.js';
import type { PackingSlipData } from '@farm/shared';

const styles = StyleSheet.create({
  ...sharedStyles,
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  orderInfoItem: {
    textAlign: 'center',
  },
  orderInfoLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  orderInfoValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemsTable: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 10,
    color: 'white',
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
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
    flex: 1,
    textAlign: 'right',
  },
  colHarvest: {
    flex: 1,
    textAlign: 'right',
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  notesTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#92400e',
  },
});

interface PackingSlipProps {
  data: PackingSlipData;
}

export function PackingSlip({ data }: PackingSlipProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <DocumentHeader
          farm={data.farm}
          documentType="PACKING SLIP"
          date={data.order.createdAt}
        />

        {/* Title */}
        <Text style={styles.title}>PACKING SLIP</Text>

        {/* Order Info Bar */}
        <View style={styles.orderInfo}>
          <View style={styles.orderInfoItem}>
            <Text style={styles.orderInfoLabel}>ORDER NUMBER</Text>
            <Text style={styles.orderInfoValue}>{data.order.orderNumber}</Text>
          </View>
          <View style={styles.orderInfoItem}>
            <Text style={styles.orderInfoLabel}>ORDER DATE</Text>
            <Text style={styles.orderInfoValue}>{formatDate(data.order.createdAt)}</Text>
          </View>
          <View style={styles.orderInfoItem}>
            <Text style={styles.orderInfoLabel}>ITEMS</Text>
            <Text style={styles.orderInfoValue}>{data.items.length}</Text>
          </View>
        </View>

        {/* Ship To */}
        <CustomerBlock title="Ship To" customer={data.customer} />

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colProduct]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>Quantity (oz)</Text>
            <Text style={[styles.tableHeaderText, styles.colHarvest]}>Harvest Date</Text>
          </View>
          {data.items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}
            >
              <Text style={styles.colProduct}>{item.productName}</Text>
              <Text style={styles.colQuantity}>{item.quantityOz}</Text>
              <Text style={styles.colHarvest}>{formatDate(item.harvestDate)}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {data.order.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Special Instructions:</Text>
            <Text>{data.order.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <DocumentFooter farm={data.farm} />
      </Page>
    </Document>
  );
}
