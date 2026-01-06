import { z } from 'zod';

// ============================================================================
// FULFILLMENT ENUMS
// ============================================================================

export const FulfillmentMethodSchema = z.enum([
  'FARM_DELIVERY',
  'CUSTOMER_PICKUP',
  'THIRD_PARTY_PICKUP',
  'SHIPPING',
  'CSA_PICKUP',
  'CSA_DELIVERY',
  'FARMERS_MARKET',
]);

export const FulfillmentStatusSchema = z.enum([
  'PENDING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
  'FAILED',
]);

export const PaymentTypeSchema = z.enum([
  'PREPAID',
  'INVOICE',
  'COD',
  'SUBSCRIPTION',
]);

export const RouteStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

// ============================================================================
// DELIVERY ROUTE SCHEMAS
// ============================================================================

export const DeliveryRouteSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  date: z.date(),
  driverId: z.string().cuid().nullable(),
  status: RouteStatusSchema,
  estimatedDuration: z.number().int().nullable(),
  estimatedMiles: z.number().nullable(),
  actualDuration: z.number().int().nullable(),
  actualMiles: z.number().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateDeliveryRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required').max(100),
  date: z.coerce.date(),
  driverId: z.string().cuid().optional(),
  orderIds: z.array(z.string().cuid()).optional(),
  notes: z.string().optional(),
});

export const UpdateDeliveryRouteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  date: z.coerce.date().optional(),
  driverId: z.string().cuid().nullable().optional(),
  status: RouteStatusSchema.optional(),
  estimatedDuration: z.number().int().positive().optional(),
  estimatedMiles: z.number().positive().optional(),
  notes: z.string().nullable().optional(),
});

export const AddOrderToRouteSchema = z.object({
  orderId: z.string().cuid(),
  stopOrder: z.number().int().min(0).optional(),
});

export const ReorderRouteStopsSchema = z.object({
  orderIds: z.array(z.string().cuid()), // Ordered list of order IDs
});

// ============================================================================
// DELIVERY SIGNATURE SCHEMAS
// ============================================================================

export const DeliverySignatureSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string().cuid(),
  signatureData: z.string(),
  signedBy: z.string(),
  signedAt: z.date(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  photoUrl: z.string().nullable(),
  capturedBy: z.string().nullable(),
  createdAt: z.date(),
});

export const CaptureSignatureSchema = z.object({
  signatureData: z.string().min(1, 'Signature is required'),
  signedBy: z.string().min(1, 'Name is required').max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoUrl: z.string().optional(),
});

// ============================================================================
// ORDER FULFILLMENT UPDATE SCHEMAS
// ============================================================================

export const UpdateOrderFulfillmentSchema = z.object({
  fulfillmentMethod: FulfillmentMethodSchema.optional(),
  fulfillmentStatus: FulfillmentStatusSchema.optional(),
  paymentType: PaymentTypeSchema.optional(),
  deliveryDate: z.coerce.date().optional(),
  deliveryTimeSlot: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryNotes: z.string().optional(),
  distributorName: z.string().optional(),
  distributorContact: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type FulfillmentMethod = z.infer<typeof FulfillmentMethodSchema>;
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>;
export type PaymentType = z.infer<typeof PaymentTypeSchema>;
export type RouteStatus = z.infer<typeof RouteStatusSchema>;
export type DeliveryRoute = z.infer<typeof DeliveryRouteSchema>;
export type CreateDeliveryRoute = z.infer<typeof CreateDeliveryRouteSchema>;
export type UpdateDeliveryRoute = z.infer<typeof UpdateDeliveryRouteSchema>;
export type DeliverySignature = z.infer<typeof DeliverySignatureSchema>;
export type CaptureSignature = z.infer<typeof CaptureSignatureSchema>;
export type UpdateOrderFulfillment = z.infer<typeof UpdateOrderFulfillmentSchema>;

// Extended types with relations
export interface DeliveryRouteWithRelations extends DeliveryRoute {
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    customerName: string | null;
    deliveryAddress: string | null;
    deliveryStopOrder: number | null;
    fulfillmentStatus: FulfillmentStatus;
  }>;
}
