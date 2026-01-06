import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { DocumentHeader, CustomerBlock, DocumentFooter, sharedStyles, formatDate } from './shared.js';
import type { DeliveryReceiptData } from '@farm/shared';

const styles = StyleSheet.create({
  ...sharedStyles,
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ecfdf5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  deliveryInfoItem: {
    textAlign: 'center',
    flex: 1,
  },
  deliveryInfoLabel: {
    fontSize: 8,
    color: '#047857',
    marginBottom: 2,
  },
  deliveryInfoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065f46',
  },
  addressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addressBlock: {
    width: '48%',
  },
  itemsTable: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#065f46',
    padding: 10,
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
  signatureSection: {
    marginTop: 40,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#374151',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    height: 40,
    marginBottom: 4,
  },
  signatureImage: {
    height: 40,
    marginBottom: 4,
    objectFit: 'contain',
  },
  signatureInfo: {
    fontSize: 9,
    color: '#374151',
  },
  driverInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  confirmationText: {
    marginTop: 15,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
});

interface DeliveryReceiptProps {
  data: DeliveryReceiptData;
}

export function DeliveryReceipt({ data }: DeliveryReceiptProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <DocumentHeader
          farm={data.farm}
          documentType="DELIVERY RECEIPT"
          date={data.deliveryDate}
        />

        {/* Title */}
        <Text style={styles.title}>DELIVERY RECEIPT</Text>

        {/* Delivery Info Bar */}
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryInfoItem}>
            <Text style={styles.deliveryInfoLabel}>ORDER NUMBER</Text>
            <Text style={styles.deliveryInfoValue}>{data.order.orderNumber}</Text>
          </View>
          <View style={styles.deliveryInfoItem}>
            <Text style={styles.deliveryInfoLabel}>DELIVERY DATE</Text>
            <Text style={styles.deliveryInfoValue}>{formatDate(data.deliveryDate)}</Text>
          </View>
          {data.driverName && (
            <View style={styles.deliveryInfoItem}>
              <Text style={styles.deliveryInfoLabel}>DRIVER</Text>
              <Text style={styles.deliveryInfoValue}>{data.driverName}</Text>
            </View>
          )}
        </View>

        {/* Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressBlock}>
            <CustomerBlock title="Delivered To" customer={data.customer} />
          </View>
          {data.deliveryAddress && (
            <View style={styles.addressBlock}>
              <Text style={sharedStyles.sectionTitle}>Delivery Address</Text>
              <Text>{data.deliveryAddress}</Text>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colProduct]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>Quantity (oz)</Text>
          </View>
          {data.items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}
            >
              <Text style={styles.colProduct}>{item.productName}</Text>
              <Text style={styles.colQuantity}>{item.quantityOz}</Text>
            </View>
          ))}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureTitle}>Proof of Delivery</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>RECIPIENT SIGNATURE</Text>
              {data.signature?.signatureData ? (
                <Image src={data.signature.signatureData} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={styles.signatureInfo}>
                {data.signature?.signedBy || '______________________'}
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>DATE & TIME</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureInfo}>
                {data.signature?.signedAt
                  ? formatDate(data.signature.signedAt) +
                    ' ' +
                    new Date(data.signature.signedAt).toLocaleTimeString()
                  : '______________________'}
              </Text>
            </View>
          </View>
          <Text style={styles.confirmationText}>
            By signing above, you confirm that you have received the items listed in good condition.
          </Text>
        </View>

        {/* Notes */}
        {data.order.notes && (
          <View style={{ marginTop: 20, padding: 10, backgroundColor: '#fffbeb', borderRadius: 4 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Notes:</Text>
            <Text style={{ color: '#666' }}>{data.order.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <DocumentFooter farm={data.farm} />
      </Page>
    </Document>
  );
}
