import { z } from 'zod';

// SKU (Stock Keeping Unit) - Sized Product Variants
export const SkuSchema = z.object({
  id: z.string().cuid(),
  productId: z.string().cuid(),
  skuCode: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  weightOz: z.number().positive(),
  price: z.number().int().nonnegative(), // Price in cents
  isAvailable: z.boolean(),
  stockQuantity: z.number().int().nonnegative().nullable(),
  lowStockThreshold: z.number().int().nonnegative().nullable(),
  displayOrder: z.number().int(),
  isPublic: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSkuSchema = z.object({
  skuCode: z.string().min(1, 'SKU code is required').max(50),
  name: z.string().min(1, 'SKU name is required').max(100),
  weightOz: z.number().positive('Weight must be positive'),
  price: z.number().int().nonnegative('Price cannot be negative'),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  displayOrder: z.number().int().default(0),
  isPublic: z.boolean().default(true),
});

export const UpdateSkuSchema = CreateSkuSchema.partial();

// Extended types with relations
export const SkuWithProductSchema = SkuSchema.extend({
  product: z.object({
    id: z.string().cuid(),
    name: z.string(),
    categoryId: z.string().cuid().nullable(),
  }),
});

// Types
export type Sku = z.infer<typeof SkuSchema>;
export type CreateSku = z.infer<typeof CreateSkuSchema>;
export type UpdateSku = z.infer<typeof UpdateSkuSchema>;
export type SkuWithProduct = z.infer<typeof SkuWithProductSchema>;

// Helper to format price from cents to display
export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

// Helper to convert dollars to cents
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// Helper to convert cents to dollars
export function centsToDollars(cents: number): number {
  return cents / 100;
}
