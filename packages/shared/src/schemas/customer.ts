import { z } from 'zod';

// Enums
export const PaymentTermsSchema = z.enum([
  'DUE_ON_RECEIPT',
  'NET_7',
  'NET_15',
  'NET_30',
  'NET_60',
]);

export const CustomerTypeSchema = z.enum([
  'RETAIL',
  'WHOLESALE',
  'RESTAURANT',
  'FARMERS_MARKET',
  'DISTRIBUTOR',
  'OTHER',
]);

// Customer Tag schemas
export const CustomerTagSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(50),
  color: z.string(),
});

export const CreateCustomerTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3b82f6'),
});

export const UpdateCustomerTagSchema = CreateCustomerTagSchema.partial();

// Customer schemas
export const CustomerSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),

  // Contact Information
  name: z.string().min(1).max(100),
  email: z.string().email().nullable(),
  phone: z.string().max(20).nullable(),
  companyName: z.string().max(100).nullable(),

  // Address
  addressLine1: z.string().max(200).nullable(),
  addressLine2: z.string().max(200).nullable(),
  city: z.string().max(100).nullable(),
  state: z.string().max(50).nullable(),
  postalCode: z.string().max(20).nullable(),
  country: z.string(),

  // Payment Terms
  paymentTerms: z.string(),
  creditLimit: z.number().nonnegative().nullable(),
  accountBalance: z.number(),

  // Categorization
  customerType: z.string(),
  notes: z.string().nullable(),

  // Status
  isActive: z.boolean(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  companyName: z.string().max(100).optional(),

  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().default('US'),

  paymentTerms: PaymentTermsSchema.default('DUE_ON_RECEIPT'),
  creditLimit: z.number().nonnegative().optional(),

  customerType: CustomerTypeSchema.default('RETAIL'),
  notes: z.string().optional(),

  tagIds: z.array(z.string().cuid()).optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// Extended types with relations
export const CustomerWithTagsSchema = CustomerSchema.extend({
  tags: z.array(CustomerTagSchema),
});

export const CustomerWithOrdersSchema = CustomerSchema.extend({
  orders: z.array(z.object({
    id: z.string().cuid(),
    orderNumber: z.string(),
    status: z.string(),
    createdAt: z.date(),
  })),
  _count: z.object({
    orders: z.number(),
  }).optional(),
});

// Types
export type PaymentTerms = z.infer<typeof PaymentTermsSchema>;
export type CustomerType = z.infer<typeof CustomerTypeSchema>;
export type CustomerTag = z.infer<typeof CustomerTagSchema>;
export type CreateCustomerTag = z.infer<typeof CreateCustomerTagSchema>;
export type UpdateCustomerTag = z.infer<typeof UpdateCustomerTagSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
export type CustomerWithTags = z.infer<typeof CustomerWithTagsSchema>;
export type CustomerWithOrders = z.infer<typeof CustomerWithOrdersSchema>;

// Helper to format payment terms for display
export function formatPaymentTerms(terms: string): string {
  switch (terms) {
    case 'DUE_ON_RECEIPT':
      return 'Due on Receipt';
    case 'NET_7':
      return 'Net 7';
    case 'NET_15':
      return 'Net 15';
    case 'NET_30':
      return 'Net 30';
    case 'NET_60':
      return 'Net 60';
    default:
      return terms;
  }
}

// Helper to format customer type for display
export function formatCustomerType(type: string): string {
  switch (type) {
    case 'RETAIL':
      return 'Retail';
    case 'WHOLESALE':
      return 'Wholesale';
    case 'RESTAURANT':
      return 'Restaurant';
    case 'FARMERS_MARKET':
      return "Farmer's Market";
    case 'DISTRIBUTOR':
      return 'Distributor';
    case 'OTHER':
      return 'Other';
    default:
      return type;
  }
}
