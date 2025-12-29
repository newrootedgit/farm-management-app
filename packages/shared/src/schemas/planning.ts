import { z } from 'zod';

// Status enums
export const SeasonStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'COMPLETED']);
export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const TaskTypeSchema = z.enum([
  'PLANTING',
  'WATERING',
  'FERTILIZING',
  'HARVESTING',
  'MAINTENANCE',
  'INSPECTION',
  'OTHER',
]);

export type SeasonStatus = z.infer<typeof SeasonStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;

// Season schemas
export const SeasonSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  year: z.number().int().min(2020).max(2100),
  startDate: z.date(),
  endDate: z.date(),
  status: SeasonStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BaseSeasonSchema = z.object({
  name: z.string().min(1, 'Season name is required').max(100),
  year: z.number().int().min(2020).max(2100),
  startDate: z.date(),
  endDate: z.date(),
  status: SeasonStatusSchema.default('PLANNING'),
});

export const CreateSeasonSchema = BaseSeasonSchema.refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const UpdateSeasonSchema = BaseSeasonSchema.partial();

// Crop Plan schemas
export const CropPlanSchema = z.object({
  id: z.string().cuid(),
  seasonId: z.string().cuid(),
  zoneId: z.string().cuid(),
  cropName: z.string().min(1).max(100),
  variety: z.string().nullable(),
  seedDate: z.date().nullable(),
  transplantDate: z.date().nullable(),
  harvestStart: z.date().nullable(),
  harvestEnd: z.date().nullable(),
  targetYield: z.number().positive().nullable(),
  targetUnit: z.string().nullable(),
  actualYield: z.number().nonnegative().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCropPlanSchema = z.object({
  zoneId: z.string().cuid(),
  cropName: z.string().min(1, 'Crop name is required').max(100),
  variety: z.string().optional(),
  seedDate: z.date().optional(),
  transplantDate: z.date().optional(),
  harvestStart: z.date().optional(),
  harvestEnd: z.date().optional(),
  targetYield: z.number().positive().optional(),
  targetUnit: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateCropPlanSchema = z.object({
  cropName: z.string().min(1).max(100).optional(),
  variety: z.string().nullable().optional(),
  seedDate: z.date().nullable().optional(),
  transplantDate: z.date().nullable().optional(),
  harvestStart: z.date().nullable().optional(),
  harvestEnd: z.date().nullable().optional(),
  targetYield: z.number().positive().nullable().optional(),
  targetUnit: z.string().nullable().optional(),
  actualYield: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Task schemas
export const TaskSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  type: TaskTypeSchema,
  dueDate: z.date().nullable(),
  startDate: z.date().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  cropPlanId: z.string().cuid().nullable(),
  recurrence: z.any().nullable(), // JSON for recurrence pattern
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().optional(),
  type: TaskTypeSchema,
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  status: TaskStatusSchema.default('TODO'),
  priority: TaskPrioritySchema.default('MEDIUM'),
  cropPlanId: z.string().cuid().optional(),
  recurrence: z.object({
    type: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.date().optional(),
  }).optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  type: TaskTypeSchema.optional(),
  dueDate: z.date().nullable().optional(),
  startDate: z.date().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  cropPlanId: z.string().cuid().nullable().optional(),
  recurrence: z.any().nullable().optional(),
});

// Task Assignment schemas
export const TaskAssignmentSchema = z.object({
  id: z.string().cuid(),
  taskId: z.string().cuid(),
  employeeId: z.string().cuid().nullable(),
  zoneId: z.string().cuid().nullable(),
  createdAt: z.date(),
});

export const CreateTaskAssignmentSchema = z.object({
  employeeId: z.string().cuid().optional(),
  zoneId: z.string().cuid().optional(),
}).refine((data) => data.employeeId || data.zoneId, {
  message: 'Either employeeId or zoneId must be provided',
});

// Types
export type Season = z.infer<typeof SeasonSchema>;
export type CreateSeason = z.infer<typeof CreateSeasonSchema>;
export type UpdateSeason = z.infer<typeof UpdateSeasonSchema>;
export type CropPlan = z.infer<typeof CropPlanSchema>;
export type CreateCropPlan = z.infer<typeof CreateCropPlanSchema>;
export type UpdateCropPlan = z.infer<typeof UpdateCropPlanSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type TaskAssignment = z.infer<typeof TaskAssignmentSchema>;
export type CreateTaskAssignment = z.infer<typeof CreateTaskAssignmentSchema>;
