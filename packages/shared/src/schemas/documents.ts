import { z } from 'zod';

// ============================================================================
// DOCUMENT TYPE ENUM
// ============================================================================

export const DocumentTypeSchema = z.enum([
  'PACKING_SLIP',
  'INVOICE',
  'DELIVERY_RECEIPT',
  'BILL_OF_LADING',
]);

// ============================================================================
// GENERATED DOCUMENT SCHEMAS
// ============================================================================

export const GeneratedDocumentSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  orderId: z.string().cuid().nullable(),
  type: DocumentTypeSchema,
  documentNumber: z.string(),
  fileUrl: z.string(),
  fileName: z.string(),
  generatedAt: z.date(),
  generatedBy: z.string().nullable(),
  dueDate: z.date().nullable(),
  sentAt: z.date().nullable(),
  sentTo: z.string().nullable(),
  createdAt: z.date(),
});

export const GenerateDocumentSchema = z.object({
  type: DocumentTypeSchema,
  sendEmail: z.boolean().optional(),
  emailTo: z.string().email().optional(),
});

export const SendDocumentEmailSchema = z.object({
  emailTo: z.string().email('Valid email required'),
  subject: z.string().optional(),
  message: z.string().optional(),
});

// ============================================================================
// FARM DOCUMENT SETTINGS SCHEMAS
// ============================================================================

export const FarmDocumentSettingsSchema = z.object({
  invoicePrefix: z.string().min(1).max(10),
  nextInvoiceNumber: z.number().int().positive(),
  invoiceFooterNotes: z.string().nullable(),
});

export const UpdateFarmDocumentSettingsSchema = z.object({
  invoicePrefix: z.string().min(1).max(10).optional(),
  nextInvoiceNumber: z.number().int().positive().optional(),
  invoiceFooterNotes: z.string().nullable().optional(),
});

// ============================================================================
// FARM ADDRESS/CONTACT SCHEMAS
// ============================================================================

export const FarmAddressSchema = z.object({
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string(),
});

export const UpdateFarmAddressSchema = z.object({
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type GeneratedDocument = z.infer<typeof GeneratedDocumentSchema>;
export type GenerateDocument = z.infer<typeof GenerateDocumentSchema>;
export type SendDocumentEmail = z.infer<typeof SendDocumentEmailSchema>;
export type FarmDocumentSettings = z.infer<typeof FarmDocumentSettingsSchema>;
export type UpdateFarmDocumentSettings = z.infer<typeof UpdateFarmDocumentSettingsSchema>;
export type FarmAddress = z.infer<typeof FarmAddressSchema>;
export type UpdateFarmAddress = z.infer<typeof UpdateFarmAddressSchema>;

// Extended types with relations
export interface GeneratedDocumentWithRelations extends GeneratedDocument {
  order?: {
    id: string;
    orderNumber: string;
    customerName: string | null;
  } | null;
}

// Document generation data (passed to PDF templates)
export interface PackingSlipData {
  farm: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
  order: {
    orderNumber: string;
    createdAt: Date;
    notes: string | null;
  };
  customer: {
    name: string;
    companyName: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  } | null;
  items: Array<{
    productName: string;
    quantityOz: number;
    harvestDate: Date;
  }>;
}

export interface InvoiceData extends PackingSlipData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentTerms: string;
  items: Array<{
    productName: string;
    quantityOz: number;
    harvestDate: Date;
    unitPriceCents: number | null;
    lineTotalCents: number | null;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  footerNotes: string | null;
}

export interface DeliveryReceiptData extends PackingSlipData {
  deliveryDate: Date;
  deliveryAddress: string | null;
  driverName: string | null;
  signature?: {
    signatureData: string;
    signedBy: string;
    signedAt: Date;
  };
}

export interface BillOfLadingData {
  farm: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
  order: {
    orderNumber: string;
    createdAt: Date;
  };
  customer: {
    name: string;
    companyName: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  } | null;
  items: Array<{
    productName: string;
    quantityOz: number;
    weightOz?: number;
  }>;
  bolNumber: string;
  shipDate: Date;
  deliveryAddress: string | null;
  carrierName: string | null;
  vehicleId: string | null;
  driverName: string | null;
  trailerNumber: string | null;
  specialInstructions: string | null;
}
