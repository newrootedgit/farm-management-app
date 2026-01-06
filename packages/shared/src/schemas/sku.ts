import { z } from 'zod';
import { PackageTypeSchema } from './package-type';

// Sales channel for SKU - determines where this SKU can be sold
export const SkuSalesChannelSchema = z.enum(['WHOLESALE', 'RETAIL', 'BOTH']);
export type SkuSalesChannel = z.infer<typeof SkuSalesChannelSchema>;

// Weight unit options for SKUs
export const SkuWeightUnitSchema = z.enum(['oz', 'lb', 'g', 'kg']);
export type SkuWeightUnit = z.infer<typeof SkuWeightUnitSchema>;

// SKU (Stock Keeping Unit) - Sized Product Variants
export const SkuSchema = z.object({
  id: z.string().cuid(),
  productId: z.string().cuid(),
  skuCode: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  weightOz: z.number().positive(), // Weight value (field name kept for backward compatibility)
  weightUnit: SkuWeightUnitSchema, // Unit of measurement
  price: z.number().int().nonnegative(), // Price in cents
  isAvailable: z.boolean(),
  stockQuantity: z.number().int().nonnegative().nullable(),
  lowStockThreshold: z.number().int().nonnegative().nullable(),
  displayOrder: z.number().int(),
  isPublic: z.boolean(),
  imageUrl: z.string().nullable(), // SKU product image URL
  salesChannel: SkuSalesChannelSchema, // WHOLESALE, RETAIL, or BOTH
  packageTypeId: z.string().cuid().nullable(), // Reference to PackageType
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSkuSchema = z.object({
  skuCode: z.string().min(1, 'SKU code is required').max(50),
  name: z.string().min(1, 'SKU name is required').max(100),
  weightOz: z.number().positive('Weight must be positive'),
  weightUnit: SkuWeightUnitSchema.default('oz'),
  price: z.number().int().nonnegative('Price cannot be negative'),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  displayOrder: z.number().int().default(0),
  isPublic: z.boolean().default(true),
  salesChannel: SkuSalesChannelSchema.default('BOTH'),
  packageTypeId: z.string().cuid().optional(),
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

// SKU with package type included
export const SkuWithPackageTypeSchema = SkuSchema.extend({
  packageType: PackageTypeSchema.nullable(),
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

// Helper to format weight with unit
export function formatWeight(weight: number, unit: SkuWeightUnit): string {
  return `${weight}${unit}`;
}

// Weight unit display labels
export const WEIGHT_UNIT_LABELS: Record<SkuWeightUnit, string> = {
  oz: 'Ounces (oz)',
  lb: 'Pounds (lb)',
  g: 'Grams (g)',
  kg: 'Kilograms (kg)',
};
