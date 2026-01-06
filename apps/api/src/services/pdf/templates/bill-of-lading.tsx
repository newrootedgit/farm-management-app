import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentHeader, CustomerBlock, DocumentFooter, sharedStyles, formatDate } from './shared.js';
import type { BillOfLadingData } from '@farm/shared';

const styles = StyleSheet.create({
  ...sharedStyles,
  bolNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#1e3a5f',
    color: 'white',
  },
  partiesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  partyBlock: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
  },
  partyTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 2,
  },
  shipmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  shipmentItem: {
    flex: 1,
    textAlign: 'center',
  },
  shipmentLabel: {
    fontSize: 8,
    color: '#166534',
    marginBottom: 2,
  },
  shipmentValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#14532d',
  },
  itemsTable: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    padding: 8,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colDescription: {
    flex: 3,
  },
  colQuantity: {
    flex: 1,
    textAlign: 'right',
  },
  colWeight: {
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 2,
    borderTopColor: '#374151',
  },
  totalLabel: {
    flex: 3,
    fontWeight: 'bold',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  carrierSection: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
  },
  carrierTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  carrierRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  carrierLabel: {
    width: 120,
    fontSize: 9,
    color: '#6b7280',
  },
  carrierValue: {
    flex: 1,
    fontSize: 9,
  },
  instructionsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  instructionsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#92400e',
  },
  instructionsText: {
    fontSize: 9,
    color: '#78350f',
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '30%',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    height: 30,
    marginBottom: 4,
  },
  signatureSubtext: {
    fontSize: 8,
    color: '#9ca3af',
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

interface BillOfLadingProps {
  data: BillOfLadingData;
}

export function BillOfLading({ data }: BillOfLadingProps) {
  const totalWeight = data.items.reduce((sum, item) => sum + (item.weightOz || 0), 0);
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantityOz, 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <DocumentHeader
          farm={data.farm}
          documentType="BILL OF LADING"
          documentNumber={data.bolNumber}
          date={data.shipDate}
        />

        {/* BOL Number Banner */}
        <Text style={styles.bolNumber}>
          BILL OF LADING #{data.bolNumber}
        </Text>

        {/* Shipper and Consignee */}
        <View style={styles.partiesSection}>
          {/* Shipper (Farm) */}
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>SHIPPER (FROM)</Text>
            <Text style={styles.partyName}>{data.farm.name}</Text>
            {data.farm.addressLine1 && (
              <Text style={styles.partyDetail}>{data.farm.addressLine1}</Text>
            )}
            {(data.farm.city || data.farm.state || data.farm.postalCode) && (
              <Text style={styles.partyDetail}>
                {[data.farm.city, data.farm.state, data.farm.postalCode].filter(Boolean).join(', ')}
              </Text>
            )}
            {data.farm.phone && (
              <Text style={styles.partyDetail}>Phone: {data.farm.phone}</Text>
            )}
          </View>

          {/* Consignee (Customer) */}
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>CONSIGNEE (TO)</Text>
            <Text style={styles.partyName}>
              {data.customer?.companyName || data.customer?.name || 'N/A'}
            </Text>
            {data.customer?.companyName && data.customer?.name && (
              <Text style={styles.partyDetail}>Attn: {data.customer.name}</Text>
            )}
            {data.deliveryAddress ? (
              <Text style={styles.partyDetail}>{data.deliveryAddress}</Text>
            ) : (
              <>
                {data.customer?.addressLine1 && (
                  <Text style={styles.partyDetail}>{data.customer.addressLine1}</Text>
                )}
                {(data.customer?.city || data.customer?.state || data.customer?.postalCode) && (
                  <Text style={styles.partyDetail}>
                    {[data.customer?.city, data.customer?.state, data.customer?.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Shipment Info Bar */}
        <View style={styles.shipmentInfo}>
          <View style={styles.shipmentItem}>
            <Text style={styles.shipmentLabel}>ORDER NUMBER</Text>
            <Text style={styles.shipmentValue}>{data.order.orderNumber}</Text>
          </View>
          <View style={styles.shipmentItem}>
            <Text style={styles.shipmentLabel}>SHIP DATE</Text>
            <Text style={styles.shipmentValue}>{formatDate(data.shipDate)}</Text>
          </View>
          <View style={styles.shipmentItem}>
            <Text style={styles.shipmentLabel}>TOTAL ITEMS</Text>
            <Text style={styles.shipmentValue}>{data.items.length}</Text>
          </View>
          <View style={styles.shipmentItem}>
            <Text style={styles.shipmentLabel}>TOTAL WEIGHT</Text>
            <Text style={styles.shipmentValue}>{(totalWeight / 16).toFixed(2)} lbs</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>Qty (oz)</Text>
            <Text style={[styles.tableHeaderText, styles.colWeight]}>Weight (oz)</Text>
          </View>
          {data.items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: '#f9fafb' } : {}]}
            >
              <Text style={styles.colDescription}>{item.productName}</Text>
              <Text style={styles.colQuantity}>{item.quantityOz}</Text>
              <Text style={styles.colWeight}>{item.weightOz || item.quantityOz}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>{totalQuantity}</Text>
            <Text style={styles.totalValue}>{totalWeight || totalQuantity}</Text>
          </View>
        </View>

        {/* Carrier Information */}
        {(data.carrierName || data.vehicleId || data.driverName) && (
          <View style={styles.carrierSection}>
            <Text style={styles.carrierTitle}>Carrier Information</Text>
            {data.carrierName && (
              <View style={styles.carrierRow}>
                <Text style={styles.carrierLabel}>Carrier Name:</Text>
                <Text style={styles.carrierValue}>{data.carrierName}</Text>
              </View>
            )}
            {data.vehicleId && (
              <View style={styles.carrierRow}>
                <Text style={styles.carrierLabel}>Vehicle ID:</Text>
                <Text style={styles.carrierValue}>{data.vehicleId}</Text>
              </View>
            )}
            {data.driverName && (
              <View style={styles.carrierRow}>
                <Text style={styles.carrierLabel}>Driver Name:</Text>
                <Text style={styles.carrierValue}>{data.driverName}</Text>
              </View>
            )}
            {data.trailerNumber && (
              <View style={styles.carrierRow}>
                <Text style={styles.carrierLabel}>Trailer Number:</Text>
                <Text style={styles.carrierValue}>{data.trailerNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* Special Instructions */}
        {data.specialInstructions && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsTitle}>Special Instructions:</Text>
            <Text style={styles.instructionsText}>{data.specialInstructions}</Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>SHIPPER SIGNATURE</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureSubtext}>Date: _______________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>CARRIER SIGNATURE</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureSubtext}>Date: _______________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>RECEIVER SIGNATURE</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureSubtext}>Date: _______________</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Received the above described goods in apparent good order, except as noted.
          The carrier agrees to deliver to consignee at destination.
        </Text>

        {/* Footer */}
        <DocumentFooter farm={data.farm} />
      </Page>
    </Document>
  );
}
