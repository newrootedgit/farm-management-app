import { z } from 'zod';

// Employee status
export const EmployeeStatusSchema = z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']);
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;

// Employee schemas
export const EmployeeSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  farmUserId: z.string().cuid().nullable(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  hireDate: z.date().nullable(),
  hourlyRate: z.number().nonnegative().nullable(),
  status: EmployeeStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.date().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  status: EmployeeStatusSchema.default('ACTIVE'),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

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
