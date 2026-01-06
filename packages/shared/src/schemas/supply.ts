import { z } from 'zod';

// Supply usage types
export const SupplyUsageTypeSchema = z.enum([
  'PRODUCTION',      // Used during production (seeding, etc.)
  'ADJUSTMENT',      // Manual stock adjustment
  'WASTE',           // Discarded/spoiled
  'OTHER',           // Other usage
  'INVENTORY_CHECK', // Manual inventory count that sets absolute value
]);
export type SupplyUsageType = z.infer<typeof SupplyUsageTypeSchema>;

// Supply Category schemas
export const SupplyCategorySchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(50),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSupplyCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  sortOrder: z.number().int().optional(),
});

export const UpdateSupplyCategorySchema = CreateSupplyCategorySchema.partial();

// Supply schemas
export const SupplySchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  categoryId: z.string().cuid(),
  name: z.string().min(1).max(100),
  sku: z.string().nullable(),
  productId: z.string().cuid().nullable(),
  unit: z.string().nullable(),
  currentStock: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSupplySchema = z.object({
  categoryId: z.string().cuid({ message: 'Category is required' }),
  name: z.string().min(1, 'Supply name is required').max(100),
  sku: z.string().optional(),
  productId: z.string().cuid().optional(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateSupplySchema = CreateSupplySchema.partial();

// Inventory Check schema
export const InventoryCheckSchema = z.object({
  actualQuantity: z.number({ message: 'Actual quantity is required' }),
  notes: z.string().optional(),
});

export type InventoryCheck = z.infer<typeof InventoryCheckSchema>;

// Supply Purchase schemas
export const SupplyPurchaseSchema = z.object({
  id: z.string().cuid(),
  supplyId: z.string().cuid(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitCost: z.number().int().nonnegative(),
  totalCost: z.number().int().nonnegative(),
  supplier: z.string().nullable(),
  lotNumber: z.string().nullable(),
  purchaseDate: z.date(),
  expiryDate: z.date().nullable(),
  notes: z.string().nullable(),
  receivedBy: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateSupplyPurchaseSchema = z.object({
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  unit: z.string().min(1, 'Unit is required'),
  unitCost: z.number().int().nonnegative({ message: 'Unit cost cannot be negative' }),
  supplier: z.string().optional(),
  lotNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  receivedBy: z.string().optional(),
});

export const UpdateSupplyPurchaseSchema = CreateSupplyPurchaseSchema.partial();

// Supply Usage schemas
export const SupplyUsageSchema = z.object({
  id: z.string().cuid(),
  supplyId: z.string().cuid(),
  quantity: z.number(),
  usageType: SupplyUsageTypeSchema,
  taskId: z.string().cuid().nullable(),
  orderItemId: z.string().cuid().nullable(),
  lotNumber: z.string().nullable(),
  notes: z.string().nullable(),
  recordedBy: z.string().nullable(),
  usageDate: z.date(),
  createdAt: z.date(),
});

export const CreateSupplyUsageSchema = z.object({
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  usageType: SupplyUsageTypeSchema,
  taskId: z.string().cuid().optional(),
  orderItemId: z.string().cuid().optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
  usageDate: z.coerce.date().optional(),
});

// Types
export type SupplyCategory = z.infer<typeof SupplyCategorySchema>;
export type CreateSupplyCategory = z.infer<typeof CreateSupplyCategorySchema>;
export type UpdateSupplyCategory = z.infer<typeof UpdateSupplyCategorySchema>;
export type Supply = z.infer<typeof SupplySchema>;
export type CreateSupply = z.infer<typeof CreateSupplySchema>;
export type UpdateSupply = z.infer<typeof UpdateSupplySchema>;
export type SupplyPurchase = z.infer<typeof SupplyPurchaseSchema>;
export type CreateSupplyPurchase = z.infer<typeof CreateSupplyPurchaseSchema>;
export type UpdateSupplyPurchase = z.infer<typeof UpdateSupplyPurchaseSchema>;
export type SupplyUsage = z.infer<typeof SupplyUsageSchema>;
export type CreateSupplyUsage = z.infer<typeof CreateSupplyUsageSchema>;
