import { z } from 'zod';

// ============================================================================
// CSA ENUMS
// ============================================================================

export const CsaProgramStatusSchema = z.enum([
  'DRAFT',
  'OPEN_ENROLLMENT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const CsaPaymentStatusSchema = z.enum([
  'PENDING',
  'PARTIAL',
  'PAID',
  'REFUNDED',
]);

export const CsaMemberStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'CANCELLED',
]);

export const CsaWeekStatusSchema = z.enum([
  'PLANNING',
  'FINALIZED',
  'DISTRIBUTED',
]);

export const PreferenceTypeSchema = z.enum([
  'LOVE',
  'LIKE',
  'DISLIKE',
  'ALLERGY',
]);

// ============================================================================
// CSA PROGRAM SCHEMAS
// ============================================================================

export const CsaProgramSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  startDate: z.date(),
  endDate: z.date(),
  pickupDay: z.number().int().min(0).max(6).nullable(),
  pickupTimeStart: z.string().nullable(),
  pickupTimeEnd: z.string().nullable(),
  status: CsaProgramStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCsaProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(100),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  pickupDay: z.number().int().min(0).max(6).optional(),
  pickupTimeStart: z.string().optional(),
  pickupTimeEnd: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const UpdateCsaProgramSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pickupDay: z.number().int().min(0).max(6).nullable().optional(),
  pickupTimeStart: z.string().nullable().optional(),
  pickupTimeEnd: z.string().nullable().optional(),
  status: CsaProgramStatusSchema.optional(),
});

// ============================================================================
// CSA SHARE TYPE SCHEMAS
// ============================================================================

export const CsaShareTypeSchema = z.object({
  id: z.string().cuid(),
  programId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  price: z.number().int().positive(),
  weeklyPrice: z.number().int().positive().nullable(),
  maxMembers: z.number().int().positive().nullable(),
  displayOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCsaShareTypeSchema = z.object({
  name: z.string().min(1, 'Share type name is required').max(100),
  description: z.string().optional(),
  price: z.number().int().positive('Price must be positive'),
  weeklyPrice: z.number().int().positive().optional(),
  maxMembers: z.number().int().positive().optional(),
  displayOrder: z.number().int().optional(),
});

export const UpdateCsaShareTypeSchema = CreateCsaShareTypeSchema.partial();

// ============================================================================
// CSA MEMBER SCHEMAS
// ============================================================================

export const CsaMemberSchema = z.object({
  id: z.string().cuid(),
  programId: z.string().cuid(),
  customerId: z.string().cuid(),
  shareTypeId: z.string().cuid(),
  paymentStatus: CsaPaymentStatusSchema,
  paidAmount: z.number().int(),
  paymentNotes: z.string().nullable(),
  fulfillmentMethod: z.enum(['CSA_PICKUP', 'CSA_DELIVERY']),
  pickupLocationId: z.string().cuid().nullable(),
  status: CsaMemberStatusSchema,
  notes: z.string().nullable(),
  enrolledAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EnrollCsaMemberSchema = z.object({
  customerId: z.string().cuid('Customer is required'),
  shareTypeId: z.string().cuid('Share type is required'),
  fulfillmentMethod: z.enum(['CSA_PICKUP', 'CSA_DELIVERY']).default('CSA_PICKUP'),
  pickupLocationId: z.string().cuid().optional(),
  notes: z.string().optional(),
});

export const UpdateCsaMemberSchema = z.object({
  shareTypeId: z.string().cuid().optional(),
  fulfillmentMethod: z.enum(['CSA_PICKUP', 'CSA_DELIVERY']).optional(),
  pickupLocationId: z.string().cuid().nullable().optional(),
  status: CsaMemberStatusSchema.optional(),
  notes: z.string().nullable().optional(),
});

export const RecordCsaPaymentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  notes: z.string().optional(),
});

// ============================================================================
// CSA MEMBER PREFERENCE SCHEMAS
// ============================================================================

export const CsaMemberPreferenceSchema = z.object({
  id: z.string().cuid(),
  memberId: z.string().cuid(),
  productId: z.string().cuid(),
  preference: PreferenceTypeSchema,
  notes: z.string().nullable(),
});

export const SetMemberPreferenceSchema = z.object({
  productId: z.string().cuid('Product is required'),
  preference: PreferenceTypeSchema,
  notes: z.string().optional(),
});

// ============================================================================
// CSA PICKUP LOCATION SCHEMAS
// ============================================================================

export const CsaPickupLocationSchema = z.object({
  id: z.string().cuid(),
  programId: z.string().cuid(),
  name: z.string().min(1).max(100),
  address: z.string().min(1),
  pickupDay: z.number().int().min(0).max(6).nullable(),
  pickupTimeStart: z.string().nullable(),
  pickupTimeEnd: z.string().nullable(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
});

export const CreateCsaPickupLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100),
  address: z.string().min(1, 'Address is required'),
  pickupDay: z.number().int().min(0).max(6).optional(),
  pickupTimeStart: z.string().optional(),
  pickupTimeEnd: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateCsaPickupLocationSchema = CreateCsaPickupLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ============================================================================
// CSA WEEK SCHEMAS
// ============================================================================

export const CsaWeekSchema = z.object({
  id: z.string().cuid(),
  programId: z.string().cuid(),
  weekNumber: z.number().int().positive(),
  weekDate: z.date(),
  status: CsaWeekStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdateCsaWeekSchema = z.object({
  weekDate: z.coerce.date().optional(),
  status: CsaWeekStatusSchema.optional(),
  notes: z.string().nullable().optional(),
});

// ============================================================================
// CSA WEEK ALLOCATION SCHEMAS
// ============================================================================

export const CsaWeekAllocationSchema = z.object({
  id: z.string().cuid(),
  weekId: z.string().cuid(),
  shareTypeId: z.string().cuid(),
  productId: z.string().cuid(),
  quantityOz: z.number().positive(),
});

export const SetWeekAllocationSchema = z.object({
  shareTypeId: z.string().cuid('Share type is required'),
  productId: z.string().cuid('Product is required'),
  quantityOz: z.number().positive('Quantity must be positive'),
});

export const BulkSetWeekAllocationsSchema = z.object({
  allocations: z.array(SetWeekAllocationSchema).min(1),
});

// ============================================================================
// CSA MEMBER SKIP SCHEMAS
// ============================================================================

export const CsaMemberSkipSchema = z.object({
  id: z.string().cuid(),
  memberId: z.string().cuid(),
  weekId: z.string().cuid(),
  reason: z.string().nullable(),
  createdAt: z.date(),
});

export const SkipWeekSchema = z.object({
  reason: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type CsaProgramStatus = z.infer<typeof CsaProgramStatusSchema>;
export type CsaPaymentStatus = z.infer<typeof CsaPaymentStatusSchema>;
export type CsaMemberStatus = z.infer<typeof CsaMemberStatusSchema>;
export type CsaWeekStatus = z.infer<typeof CsaWeekStatusSchema>;
export type PreferenceType = z.infer<typeof PreferenceTypeSchema>;

export type CsaProgram = z.infer<typeof CsaProgramSchema>;
export type CreateCsaProgram = z.infer<typeof CreateCsaProgramSchema>;
export type UpdateCsaProgram = z.infer<typeof UpdateCsaProgramSchema>;

export type CsaShareType = z.infer<typeof CsaShareTypeSchema>;
export type CreateCsaShareType = z.infer<typeof CreateCsaShareTypeSchema>;
export type UpdateCsaShareType = z.infer<typeof UpdateCsaShareTypeSchema>;

export type CsaMember = z.infer<typeof CsaMemberSchema>;
export type EnrollCsaMember = z.infer<typeof EnrollCsaMemberSchema>;
export type UpdateCsaMember = z.infer<typeof UpdateCsaMemberSchema>;
export type RecordCsaPayment = z.infer<typeof RecordCsaPaymentSchema>;

export type CsaMemberPreference = z.infer<typeof CsaMemberPreferenceSchema>;
export type SetMemberPreference = z.infer<typeof SetMemberPreferenceSchema>;

export type CsaPickupLocation = z.infer<typeof CsaPickupLocationSchema>;
export type CreateCsaPickupLocation = z.infer<typeof CreateCsaPickupLocationSchema>;
export type UpdateCsaPickupLocation = z.infer<typeof UpdateCsaPickupLocationSchema>;

export type CsaWeek = z.infer<typeof CsaWeekSchema>;
export type UpdateCsaWeek = z.infer<typeof UpdateCsaWeekSchema>;

export type CsaWeekAllocation = z.infer<typeof CsaWeekAllocationSchema>;
export type SetWeekAllocation = z.infer<typeof SetWeekAllocationSchema>;

export type CsaMemberSkip = z.infer<typeof CsaMemberSkipSchema>;
export type SkipWeek = z.infer<typeof SkipWeekSchema>;

// Extended types with relations
export interface CsaProgramWithRelations extends CsaProgram {
  shareTypes: CsaShareType[];
  members: Array<CsaMember & {
    customer: { id: string; name: string; email: string | null };
  }>;
  weeks: CsaWeek[];
  pickupLocations: CsaPickupLocation[];
  _count?: {
    members: number;
    weeks: number;
  };
}

export interface CsaMemberWithRelations extends CsaMember {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
  shareType: {
    id: string;
    name: string;
    price: number;
  };
  pickupLocation?: CsaPickupLocation | null;
  preferences: CsaMemberPreference[];
  skippedWeeks: CsaMemberSkip[];
}

export interface CsaWeekWithRelations extends CsaWeek {
  allocations: Array<CsaWeekAllocation & {
    product: { id: string; name: string };
    shareType: { id: string; name: string };
  }>;
  skipRequests: Array<CsaMemberSkip & {
    member: {
      id: string;
      customer: { name: string };
      shareType: { id: string; name: string };
    };
  }>;
}

// Helper for calculating weeks in a CSA program
export function calculateCsaWeeks(startDate: Date, endDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / msPerWeek);
}

// Get day name from day number
export function getCsaDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || '';
}
