import { z } from 'zod';

// ============================================================================
// RECURRENCE TYPE ENUM
// ============================================================================

export const RecurrenceTypeSchema = z.enum(['FIXED_DAY', 'INTERVAL']);
export type RecurrenceType = z.infer<typeof RecurrenceTypeSchema>;

// ============================================================================
// RECURRING ORDER SCHEDULE SCHEMAS
// ============================================================================

export const RecurringOrderScheduleSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  customerId: z.string().cuid().nullable(),
  scheduleType: RecurrenceTypeSchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  intervalDays: z.number().int().positive().nullable(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  leadTimeDays: z.number().int().min(7).max(90),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RecurringOrderItemSchema = z.object({
  id: z.string().cuid(),
  scheduleId: z.string().cuid(),
  productId: z.string().cuid(),
  quantityOz: z.number().positive(),
  overagePercent: z.number().min(0).max(100),
  createdAt: z.date(),
});

export const RecurringOrderSkipSchema = z.object({
  id: z.string().cuid(),
  scheduleId: z.string().cuid(),
  skipDate: z.date(),
  reason: z.string().nullable(),
  createdAt: z.date(),
});

// ============================================================================
// CREATE/UPDATE SCHEMAS
// ============================================================================

export const CreateRecurringOrderItemSchema = z.object({
  productId: z.string().cuid('Product is required'),
  quantityOz: z.number().positive('Quantity must be positive'),
  overagePercent: z.number().min(0).max(100).default(10),
});

export const CreateRecurringOrderScheduleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  customerId: z.string().cuid().optional(),
  scheduleType: RecurrenceTypeSchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  intervalDays: z.number().int().positive().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  leadTimeDays: z.number().int().min(7).max(90).default(28),
  notes: z.string().optional(),
  items: z.array(CreateRecurringOrderItemSchema).min(1, 'At least one item is required'),
}).refine((data) => {
  if (data.scheduleType === 'FIXED_DAY') {
    return data.daysOfWeek && data.daysOfWeek.length > 0;
  }
  return data.intervalDays && data.intervalDays > 0;
}, {
  message: 'FIXED_DAY requires daysOfWeek, INTERVAL requires intervalDays',
});

export const UpdateRecurringOrderScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  customerId: z.string().cuid().nullable().optional(),
  scheduleType: RecurrenceTypeSchema.optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  intervalDays: z.number().int().positive().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  leadTimeDays: z.number().int().min(7).max(90).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export const CreateRecurringOrderSkipSchema = z.object({
  skipDate: z.coerce.date(),
  reason: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type RecurringOrderSchedule = z.infer<typeof RecurringOrderScheduleSchema>;
export type RecurringOrderItem = z.infer<typeof RecurringOrderItemSchema>;
export type RecurringOrderSkip = z.infer<typeof RecurringOrderSkipSchema>;
export type CreateRecurringOrderSchedule = z.infer<typeof CreateRecurringOrderScheduleSchema>;
export type UpdateRecurringOrderSchedule = z.infer<typeof UpdateRecurringOrderScheduleSchema>;
export type CreateRecurringOrderItem = z.infer<typeof CreateRecurringOrderItemSchema>;
export type CreateRecurringOrderSkip = z.infer<typeof CreateRecurringOrderSkipSchema>;

// Extended types with relations
export interface RecurringOrderScheduleWithRelations extends RecurringOrderSchedule {
  items: Array<RecurringOrderItem & {
    product: {
      id: string;
      name: string;
      avgYieldPerTray: number | null;
      daysSoaking: number | null;
      daysGermination: number | null;
      daysLight: number | null;
    };
  }>;
  customer?: {
    id: string;
    name: string;
  } | null;
  skippedDates: RecurringOrderSkip[];
  _count?: {
    generatedOrders: number;
  };
}
