import { z } from 'zod';

// Employee position types
export const EmployeePositionSchema = z.enum(['FARM_MANAGER', 'SALESPERSON', 'FARM_OPERATOR']);
export type EmployeePosition = z.infer<typeof EmployeePositionSchema>;

// Employee status
export const EmployeeStatusSchema = z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']);
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;

// Invite status for account creation flow
export const InviteStatusSchema = z.enum(['NOT_INVITED', 'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
export type InviteStatus = z.infer<typeof InviteStatusSchema>;

// Employee schemas
export const EmployeeSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  farmUserId: z.string().cuid().nullable(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  position: EmployeePositionSchema.nullable(),
  department: z.string().nullable(),
  hireDate: z.date().nullable(),
  hourlyRate: z.number().nonnegative().nullable(),
  status: EmployeeStatusSchema,
  // Invite fields
  inviteToken: z.string().nullable().optional(),
  inviteStatus: InviteStatusSchema,
  inviteExpiresAt: z.date().nullable().optional(),
  invitedAt: z.date().nullable().optional(),
  acceptedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Base schema for create (before refine)
const CreateEmployeeBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: EmployeePositionSchema,
  department: z.string().optional(),
  hireDate: z.string().optional(), // Accept ISO string from frontend
  hourlyRate: z.number().nonnegative().optional(),
  status: EmployeeStatusSchema.default('ACTIVE'),
});

// Require email OR phone for password recovery
export const CreateEmployeeSchema = CreateEmployeeBaseSchema.refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required for password recovery', path: ['email'] }
);

export const UpdateEmployeeSchema = CreateEmployeeBaseSchema.partial();

// Shift schemas
export const ShiftSchema = z.object({
  id: z.string().cuid(),
  employeeId: z.string().cuid(),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  breakMins: z.number().nonnegative(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BaseShiftSchema = z.object({
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  breakMins: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export const CreateShiftSchema = BaseShiftSchema.refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const UpdateShiftSchema = BaseShiftSchema.partial();

// Time Entry schemas
export const TimeEntrySchema = z.object({
  id: z.string().cuid(),
  employeeId: z.string().cuid(),
  clockIn: z.date(),
  clockOut: z.date().nullable(),
  breakMins: z.number().nonnegative(),
  totalHours: z.number().nonnegative().nullable(),
  notes: z.string().nullable(),
  approved: z.boolean(),
  approvedBy: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ClockInSchema = z.object({
  notes: z.string().optional(),
});

export const ClockOutSchema = z.object({
  breakMins: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export const UpdateTimeEntrySchema = z.object({
  clockIn: z.date().optional(),
  clockOut: z.date().optional(),
  breakMins: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  approved: z.boolean().optional(),
});

// Types
export type Employee = z.infer<typeof EmployeeSchema>;
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>;
export type Shift = z.infer<typeof ShiftSchema>;
export type CreateShift = z.infer<typeof CreateShiftSchema>;
export type UpdateShift = z.infer<typeof UpdateShiftSchema>;
export type TimeEntry = z.infer<typeof TimeEntrySchema>;
export type ClockIn = z.infer<typeof ClockInSchema>;
export type ClockOut = z.infer<typeof ClockOutSchema>;
export type UpdateTimeEntry = z.infer<typeof UpdateTimeEntrySchema>;
