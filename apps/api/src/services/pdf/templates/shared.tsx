import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Shared styles
export const sharedStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 50,
    objectFit: 'contain',
  },
  farmInfo: {
    textAlign: 'right',
  },
  farmName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  farmAddress: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
});

// Farm header component
interface FarmInfo {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface DocumentHeaderProps {
  farm: FarmInfo;
  documentType: string;
  documentNumber?: string;
  date: Date;
}

export function DocumentHeader({ farm, documentType, documentNumber, date }: DocumentHeaderProps) {
  const addressParts = [
    farm.addressLine1,
    [farm.city, farm.state, farm.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <View style={sharedStyles.header}>
      <View>
        {farm.logoUrl ? (
          <Image src={farm.logoUrl} style={sharedStyles.logo} />
        ) : (
          <Text style={sharedStyles.farmName}>{farm.name}</Text>
        )}
      </View>
      <View style={sharedStyles.farmInfo}>
        {farm.logoUrl && <Text style={sharedStyles.farmName}>{farm.name}</Text>}
        {addressParts.map((line, i) => (
          <Text key={i} style={sharedStyles.farmAddress}>{line}</Text>
        ))}
        {farm.phone && <Text style={sharedStyles.farmAddress}>{farm.phone}</Text>}
        {farm.email && <Text style={sharedStyles.farmAddress}>{farm.email}</Text>}
      </View>
    </View>
  );
}

// Customer/recipient info component
interface CustomerInfo {
  name: string;
  companyName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface CustomerBlockProps {
  title: string;
  customer: CustomerInfo | null;
}

export function CustomerBlock({ title, customer }: CustomerBlockProps) {
  if (!customer) {
    return (
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>{title}</Text>
        <Text style={{ color: '#999' }}>No customer information</Text>
      </View>
    );
  }

  const addressParts = [
    customer.addressLine1,
    [customer.city, customer.state, customer.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <View style={sharedStyles.section}>
      <Text style={sharedStyles.sectionTitle}>{title}</Text>
      <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>
        {customer.companyName || customer.name}
      </Text>
      {customer.companyName && (
        <Text style={{ marginBottom: 2 }}>{customer.name}</Text>
      )}
      {addressParts.map((line, i) => (
        <Text key={i} style={{ color: '#666', marginBottom: 2 }}>{line}</Text>
      ))}
    </View>
  );
}

// Document footer component
interface DocumentFooterProps {
  notes?: string | null;
  farm: FarmInfo;
}

export function DocumentFooter({ notes, farm }: DocumentFooterProps) {
  return (
    <View style={sharedStyles.footer}>
      {notes && (
        <Text style={{ marginBottom: 6 }}>{notes}</Text>
      )}
      <Text>
        Thank you for your business! | {farm.name}
        {farm.phone && ` | ${farm.phone}`}
        {farm.email && ` | ${farm.email}`}
      </Text>
    </View>
  );
}

// Format date helper
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format currency helper
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
