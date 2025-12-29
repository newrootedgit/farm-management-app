import { z } from 'zod';

// Inventory transaction types
export const InventoryTxTypeSchema = z.enum([
  'PURCHASE',
  'SALE',
  'ADJUSTMENT',
  'TRANSFER',
  'WASTE',
  'HARVEST',
  'PLANTING',
]);
export type InventoryTxType = z.infer<typeof InventoryTxTypeSchema>;

// Product schemas
export const ProductSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  sku: z.string().nullable(),
  categoryId: z.string().cuid().nullable(),
  seedWeight: z.number().positive().nullable(),
  seedUnit: z.string().nullable(),
  unitCost: z.number().nonnegative().nullable(),
  unitPrice: z.number().nonnegative().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  sku: z.string().optional(),
  categoryId: z.string().cuid().optional(),
  seedWeight: z.number().positive().optional(),
  seedUnit: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// Product Category schemas
export const ProductCategorySchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(50),
  parentId: z.string().cuid().nullable(),
});

export const CreateProductCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  parentId: z.string().cuid().optional(),
});

// Inventory Item schemas
export const InventoryItemSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number(),
  unit: z.string().min(1),
  location: z.string().nullable(),
  expiryDate: z.date().nullable(),
  lotNumber: z.string().nullable(),
  reorderPoint: z.number().nonnegative().nullable(),
  reorderQty: z.number().positive().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateInventoryItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().nonnegative('Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required'),
  location: z.string().optional(),
  expiryDate: z.date().optional(),
  lotNumber: z.string().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  reorderQty: z.number().positive().optional(),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

// Inventory Transaction schemas
export const InventoryTransactionSchema = z.object({
  id: z.string().cuid(),
  inventoryItemId: z.string().cuid(),
  type: InventoryTxTypeSchema,
  quantity: z.number(),
  previousQty: z.number(),
  newQty: z.number(),
  reason: z.string().nullable(),
  reference: z.string().nullable(),
  performedBy: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateInventoryTransactionSchema = z.object({
  type: InventoryTxTypeSchema,
  quantity: z.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

// Types
export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type CreateProductCategory = z.infer<typeof CreateProductCategorySchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type CreateInventoryItem = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItem = z.infer<typeof UpdateInventoryItemSchema>;
export type InventoryTransaction = z.infer<typeof InventoryTransactionSchema>;
export type CreateInventoryTransaction = z.infer<typeof CreateInventoryTransactionSchema>;
