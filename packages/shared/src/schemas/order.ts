import { z } from 'zod';

// ============================================================================
// ORDER STATUS ENUMS
// ============================================================================

export const OrderStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'READY',
  'DELIVERED',
  'CANCELLED',
]);

export const OrderItemStatusSchema = z.enum([
  'PENDING',
  'SOAKING',
  'GERMINATING',
  'GROWING',
  'HARVESTED',
  'CANCELLED',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderItemStatus = z.infer<typeof OrderItemStatusSchema>;

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const OrderSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  orderNumber: z.string().min(1),
  customer: z.string().max(100).nullable(),
  status: OrderStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateOrderSchema = z.object({
  orderNumber: z.string().min(1).optional(), // Auto-generate if not provided
  customer: z.string().max(100).optional(), // Optional customer name
  notes: z.string().optional(),
  items: z.array(z.lazy(() => CreateOrderItemSchema)).min(1, 'At least one item is required'),
});

export const UpdateOrderSchema = z.object({
  orderNumber: z.string().min(1).optional(),
  customer: z.string().min(1).max(100).optional(),
  status: OrderStatusSchema.optional(),
  notes: z.string().nullable().optional(),
});

// ============================================================================
// ORDER ITEM SCHEMAS
// ============================================================================

export const OrderItemSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string().cuid(),
  productId: z.string().cuid(),
  quantityOz: z.number().positive(),
  harvestDate: z.date(),
  overagePercent: z.number().min(0).max(100),
  traysNeeded: z.number().int().positive(),
  soakDate: z.date(),
  seedDate: z.date(),
  moveToLightDate: z.date(),
  actualYieldOz: z.number().positive().nullable(),
  actualTrays: z.number().int().positive().nullable(),
  seedLot: z.string().nullable(),
  status: OrderItemStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateOrderItemSchema = z.object({
  productId: z.string().cuid('Product is required'),
  quantityOz: z.number().positive('Quantity must be positive'),
  harvestDate: z.coerce.date(),
  overagePercent: z.number().min(0).max(100).default(10),
});

export const UpdateOrderItemSchema = z.object({
  quantityOz: z.number().positive().optional(),
  harvestDate: z.coerce.date().optional(),
  overagePercent: z.number().min(0).max(100).optional(),
  actualYieldOz: z.number().positive().nullable().optional(),
  actualTrays: z.number().int().positive().nullable().optional(),
  status: OrderItemStatusSchema.optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type Order = z.infer<typeof OrderSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type CreateOrderItem = z.infer<typeof CreateOrderItemSchema>;
export type UpdateOrderItem = z.infer<typeof UpdateOrderItemSchema>;

// Extended types with relations
export interface OrderWithItems extends Order {
  items: OrderItemWithProduct[];
}

export interface OrderItemWithProduct extends OrderItem {
  product: {
    id: string;
    name: string;
    avgYieldPerTray: number | null;
    daysSoaking: number | null;
    daysGermination: number | null;
    daysLight: number | null;
  };
}
