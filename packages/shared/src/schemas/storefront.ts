import { z } from 'zod';

// Public storefront order submission
export const StorefrontOrderItemSchema = z.object({
  skuId: z.string().cuid(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const StorefrontOrderSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(100),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().max(20).optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  deliveryMethod: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
  deliveryAddress: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(StorefrontOrderItemSchema).min(1, 'At least one item is required'),
});

// Storefront response types
export const StorefrontProductSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  categoryId: z.string().cuid().nullable(),
  category: z.object({
    id: z.string().cuid(),
    name: z.string(),
  }).nullable(),
  skus: z.array(z.object({
    id: z.string().cuid(),
    skuCode: z.string(),
    name: z.string(),
    weightOz: z.number(),
    price: z.number().int(),
    isAvailable: z.boolean(),
    displayOrder: z.number().int(),
  })),
});

export const StorefrontFarmSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  address: z.string().nullable(),
});

export const StorefrontDataSchema = z.object({
  farm: StorefrontFarmSchema,
  products: z.array(StorefrontProductSchema),
  categories: z.array(z.object({
    id: z.string().cuid(),
    name: z.string(),
    displayOrder: z.number().int(),
  })),
});

export const StorefrontOrderResponseSchema = z.object({
  orderId: z.string().cuid(),
  orderNumber: z.string(),
  totalCents: z.number().int(),
  paymentLink: z.string().nullable(),
});

// Types
export type StorefrontOrder = z.infer<typeof StorefrontOrderSchema>;
export type StorefrontOrderItem = z.infer<typeof StorefrontOrderItemSchema>;
export type StorefrontProduct = z.infer<typeof StorefrontProductSchema>;
export type StorefrontFarm = z.infer<typeof StorefrontFarmSchema>;
export type StorefrontData = z.infer<typeof StorefrontDataSchema>;
export type StorefrontOrderResponse = z.infer<typeof StorefrontOrderResponseSchema>;
