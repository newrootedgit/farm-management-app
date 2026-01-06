import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PackingSlip } from './templates/packing-slip.js';
import { Invoice } from './templates/invoice.js';
import { DeliveryReceipt } from './templates/delivery-receipt.js';
import { BillOfLading } from './templates/bill-of-lading.js';
import type {
  PackingSlipData,
  InvoiceData,
  DeliveryReceiptData,
  BillOfLadingData,
  DocumentType,
} from '@farm/shared';

// ============================================================================
// PDF GENERATION SERVICE
// ============================================================================

/**
 * Generate a PDF buffer for a packing slip
 */
export async function generatePackingSlip(data: PackingSlipData): Promise<Buffer> {
  const element = React.createElement(PackingSlip, { data }) as React.ReactElement;
  return renderToBuffer(element as any);
}

/**
 * Generate a PDF buffer for an invoice
 */
export async function generateInvoice(data: InvoiceData): Promise<Buffer> {
  const element = React.createElement(Invoice, { data }) as React.ReactElement;
  return renderToBuffer(element as any);
}

/**
 * Generate a PDF buffer for a delivery receipt
 */
export async function generateDeliveryReceipt(data: DeliveryReceiptData): Promise<Buffer> {
  const element = React.createElement(DeliveryReceipt, { data }) as React.ReactElement;
  return renderToBuffer(element as any);
}

/**
 * Generate a PDF buffer for a bill of lading
 */
export async function generateBillOfLading(data: BillOfLadingData): Promise<Buffer> {
  const element = React.createElement(BillOfLading, { data }) as React.ReactElement;
  return renderToBuffer(element as any);
}

// ============================================================================
// DOCUMENT DATA BUILDERS
// ============================================================================

interface OrderWithRelations {
  id: string;
  orderNumber: string;
  createdAt: Date;
  notes: string | null;
  deliveryDate: Date | null;
  deliveryAddress: string | null;
  invoiceNumber: string | null;
  invoicedAt: Date | null;
  invoiceDueDate: Date | null;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    paymentTerms: string | null;
  } | null;
  farm: {
    id: string;
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    invoicePrefix: string;
    invoiceFooterNotes: string | null;
  };
  items: Array<{
    id: string;
    quantityOz: number;
    harvestDate: Date;
    unitPriceCents: number | null;
    lineTotalCents: number | null;
    product: {
      id: string;
      name: string;
    };
  }>;
  deliveryRoute?: {
    driver?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  deliverySignature?: {
    signatureData: string;
    signedBy: string;
    signedAt: Date;
  } | null;
}

/**
 * Build packing slip data from an order
 */
export function buildPackingSlipData(order: OrderWithRelations): PackingSlipData {
  return {
    farm: {
      name: order.farm.name,
      logoUrl: order.farm.logoUrl,
      phone: order.farm.phone,
      email: order.farm.email,
      addressLine1: order.farm.addressLine1,
      city: order.farm.city,
      state: order.farm.state,
      postalCode: order.farm.postalCode,
    },
    order: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      notes: order.notes,
    },
    customer: order.customer
      ? {
          name: order.customer.name,
          companyName: order.customer.companyName,
          addressLine1: order.customer.addressLine1,
          city: order.customer.city,
          state: order.customer.state,
          postalCode: order.customer.postalCode,
        }
      : null,
    items: order.items.map((item) => ({
      productName: item.product.name,
      quantityOz: item.quantityOz,
      harvestDate: item.harvestDate,
    })),
  };
}

/**
 * Build invoice data from an order
 */
export function buildInvoiceData(
  order: OrderWithRelations,
  invoiceNumber: string,
  invoiceDate: Date,
  dueDate: Date
): InvoiceData {
  const items = order.items.map((item) => {
    const unitPriceCents = item.unitPriceCents || 0;
    const lineTotalCents = item.lineTotalCents || unitPriceCents * item.quantityOz;
    return {
      productName: item.product.name,
      quantityOz: item.quantityOz,
      harvestDate: item.harvestDate,
      unitPriceCents,
      lineTotalCents,
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + (item.lineTotalCents || 0), 0);
  const taxCents = 0; // Tax calculation can be added later
  const totalCents = subtotalCents + taxCents;

  return {
    farm: {
      name: order.farm.name,
      logoUrl: order.farm.logoUrl,
      phone: order.farm.phone,
      email: order.farm.email,
      addressLine1: order.farm.addressLine1,
      city: order.farm.city,
      state: order.farm.state,
      postalCode: order.farm.postalCode,
    },
    order: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      notes: order.notes,
    },
    customer: order.customer
      ? {
          name: order.customer.name,
          companyName: order.customer.companyName,
          addressLine1: order.customer.addressLine1,
          city: order.customer.city,
          state: order.customer.state,
          postalCode: order.customer.postalCode,
        }
      : null,
    items,
    invoiceNumber,
    invoiceDate,
    dueDate,
    paymentTerms: order.customer?.paymentTerms || 'Due on Receipt',
    subtotalCents,
    taxCents,
    totalCents,
    footerNotes: order.farm.invoiceFooterNotes,
  };
}

/**
 * Build delivery receipt data from an order
 */
export function buildDeliveryReceiptData(order: OrderWithRelations): DeliveryReceiptData {
  const driverName = order.deliveryRoute?.driver
    ? `${order.deliveryRoute.driver.firstName} ${order.deliveryRoute.driver.lastName}`
    : null;

  return {
    farm: {
      name: order.farm.name,
      logoUrl: order.farm.logoUrl,
      phone: order.farm.phone,
      email: order.farm.email,
      addressLine1: order.farm.addressLine1,
      city: order.farm.city,
      state: order.farm.state,
      postalCode: order.farm.postalCode,
    },
    order: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      notes: order.notes,
    },
    customer: order.customer
      ? {
          name: order.customer.name,
          companyName: order.customer.companyName,
          addressLine1: order.customer.addressLine1,
          city: order.customer.city,
          state: order.customer.state,
          postalCode: order.customer.postalCode,
        }
      : null,
    items: order.items.map((item) => ({
      productName: item.product.name,
      quantityOz: item.quantityOz,
      harvestDate: item.harvestDate,
    })),
    deliveryDate: order.deliveryDate || new Date(),
    deliveryAddress: order.deliveryAddress,
    driverName,
    signature: order.deliverySignature
      ? {
          signatureData: order.deliverySignature.signatureData,
          signedBy: order.deliverySignature.signedBy,
          signedAt: order.deliverySignature.signedAt,
        }
      : undefined,
  };
}

/**
 * Build bill of lading data from an order
 */
export function buildBillOfLadingData(
  order: OrderWithRelations,
  bolNumber: string,
  shipDate: Date,
  carrierInfo?: {
    carrierName?: string;
    vehicleId?: string;
    trailerNumber?: string;
  }
): BillOfLadingData {
  const driverName = order.deliveryRoute?.driver
    ? `${order.deliveryRoute.driver.firstName} ${order.deliveryRoute.driver.lastName}`
    : null;

  return {
    farm: {
      name: order.farm.name,
      logoUrl: order.farm.logoUrl,
      phone: order.farm.phone,
      email: order.farm.email,
      addressLine1: order.farm.addressLine1,
      city: order.farm.city,
      state: order.farm.state,
      postalCode: order.farm.postalCode,
    },
    order: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
    },
    customer: order.customer
      ? {
          name: order.customer.name,
          companyName: order.customer.companyName,
          addressLine1: order.customer.addressLine1,
          city: order.customer.city,
          state: order.customer.state,
          postalCode: order.customer.postalCode,
        }
      : null,
    items: order.items.map((item) => ({
      productName: item.product.name,
      quantityOz: item.quantityOz,
      weightOz: item.quantityOz, // Default weight equals quantity
    })),
    bolNumber,
    shipDate,
    deliveryAddress: order.deliveryAddress,
    carrierName: carrierInfo?.carrierName || null,
    vehicleId: carrierInfo?.vehicleId || null,
    driverName,
    trailerNumber: carrierInfo?.trailerNumber || null,
    specialInstructions: order.notes,
  };
}

// ============================================================================
// UNIFIED DOCUMENT GENERATOR
// ============================================================================

interface GenerateDocumentOptions {
  type: DocumentType;
  order: OrderWithRelations;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  bolNumber?: string;
  shipDate?: Date;
  carrierInfo?: {
    carrierName?: string;
    vehicleId?: string;
    trailerNumber?: string;
  };
}

/**
 * Generate a PDF document based on type
 */
export async function generateDocument(options: GenerateDocumentOptions): Promise<Buffer> {
  const { type, order } = options;

  switch (type) {
    case 'PACKING_SLIP': {
      const data = buildPackingSlipData(order);
      return generatePackingSlip(data);
    }

    case 'INVOICE': {
      if (!options.invoiceNumber || !options.invoiceDate || !options.dueDate) {
        throw new Error('Invoice requires invoiceNumber, invoiceDate, and dueDate');
      }
      const data = buildInvoiceData(
        order,
        options.invoiceNumber,
        options.invoiceDate,
        options.dueDate
      );
      return generateInvoice(data);
    }

    case 'DELIVERY_RECEIPT': {
      const data = buildDeliveryReceiptData(order);
      return generateDeliveryReceipt(data);
    }

    case 'BILL_OF_LADING': {
      if (!options.bolNumber || !options.shipDate) {
        throw new Error('Bill of Lading requires bolNumber and shipDate');
      }
      const data = buildBillOfLadingData(
        order,
        options.bolNumber,
        options.shipDate,
        options.carrierInfo
      );
      return generateBillOfLading(data);
    }

    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}

/**
 * Get the filename for a document
 */
export function getDocumentFilename(type: DocumentType, orderNumber: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const typeNames: Record<DocumentType, string> = {
    PACKING_SLIP: 'packing-slip',
    INVOICE: 'invoice',
    DELIVERY_RECEIPT: 'delivery-receipt',
    BILL_OF_LADING: 'bill-of-lading',
  };
  return `${typeNames[type]}-${orderNumber}-${timestamp}.pdf`;
}
