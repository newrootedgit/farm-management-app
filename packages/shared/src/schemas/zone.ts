import { z } from 'zod';

// Zone types
export const ZoneTypeSchema = z.enum(['FIELD', 'GREENHOUSE', 'STORAGE', 'PROCESSING', 'EQUIPMENT', 'OFFICE', 'OTHER']);
export type ZoneType = z.infer<typeof ZoneTypeSchema>;

// Zone schemas
export const ZoneSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: ZoneTypeSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  area: z.number().positive().nullable(),
  soilType: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required').max(100),
  type: ZoneTypeSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#4CAF50'),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  area: z.number().positive().optional(),
  soilType: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateZoneSchema = CreateZoneSchema.partial();

// Farm Layout (canvas state)
export const FarmLayoutSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  canvasData: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    backgroundColor: z.string().optional(),
    gridSize: z.number().positive().optional(),
    zoom: z.number().positive().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdateFarmLayoutSchema = z.object({
  canvasData: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    backgroundColor: z.string().optional(),
    gridSize: z.number().positive().optional(),
    zoom: z.number().positive().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
  }),
});

// Machine schemas
export const MachineSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  purchaseDate: z.date().nullable(),
  lastMaintenance: z.date().nullable(),
  nextMaintenance: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMachineSchema = z.object({
  name: z.string().min(1, 'Machine name is required').max(100),
  type: z.string().min(1, 'Machine type is required'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.date().optional(),
  lastMaintenance: z.date().optional(),
  nextMaintenance: z.date().optional(),
});

export const UpdateMachineSchema = CreateMachineSchema.partial();

// Zone Output (production metrics)
export const ZoneOutputSchema = z.object({
  id: z.string().cuid(),
  zoneId: z.string().cuid(),
  date: z.date(),
  productId: z.string().cuid().nullable(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  quality: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateZoneOutputSchema = z.object({
  date: z.date(),
  productId: z.string().cuid().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  quality: z.string().optional(),
  notes: z.string().optional(),
});

// Types
export type Zone = z.infer<typeof ZoneSchema>;
export type CreateZone = z.infer<typeof CreateZoneSchema>;
export type UpdateZone = z.infer<typeof UpdateZoneSchema>;
export type FarmLayout = z.infer<typeof FarmLayoutSchema>;
export type UpdateFarmLayout = z.infer<typeof UpdateFarmLayoutSchema>;
export type Machine = z.infer<typeof MachineSchema>;
export type CreateMachine = z.infer<typeof CreateMachineSchema>;
export type UpdateMachine = z.infer<typeof UpdateMachineSchema>;
export type ZoneOutput = z.infer<typeof ZoneOutputSchema>;
export type CreateZoneOutput = z.infer<typeof CreateZoneOutputSchema>;
