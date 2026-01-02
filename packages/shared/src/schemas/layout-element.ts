import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const ElementTypeSchema = z.enum(['WALL', 'DOOR', 'SINK', 'TABLE', 'GROW_RACK', 'WALKWAY', 'CIRCLE', 'CUSTOM']);
export type ElementType = z.infer<typeof ElementTypeSchema>;

export const UnitSystemSchema = z.enum(['FEET', 'METERS']);
export type UnitSystem = z.infer<typeof UnitSystemSchema>;

// ============================================================================
// LAYOUT ELEMENT SCHEMAS
// ============================================================================

export const LayoutElementSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: ElementTypeSchema,

  // Line geometry (walls)
  startX: z.number().nullable(),
  startY: z.number().nullable(),
  endX: z.number().nullable(),
  endY: z.number().nullable(),
  thickness: z.number().positive().nullable(),

  // Rectangle geometry
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  width: z.number().positive().nullable(),
  height: z.number().positive().nullable(),
  rotation: z.number().default(0),

  // Appearance
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  opacity: z.number().min(0).max(1).default(1),

  presetId: z.string().cuid().nullable(),
  metadata: z.record(z.unknown()).nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateLayoutElementSchema = z.object({
  name: z.string().min(1, 'Element name is required').max(100),
  type: ElementTypeSchema,

  // Line geometry (walls)
  startX: z.number().optional(),
  startY: z.number().optional(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  thickness: z.number().positive().optional().default(10),

  // Rectangle geometry
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  rotation: z.number().optional().default(0),

  // Appearance
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#666666'),
  opacity: z.number().min(0).max(1).optional().default(1),

  presetId: z.string().cuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateLayoutElementSchema = CreateLayoutElementSchema.partial();

// ============================================================================
// ELEMENT PRESET SCHEMAS
// ============================================================================

export const ElementPresetSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: ElementTypeSchema,
  defaultWidth: z.number().positive().nullable(),
  defaultHeight: z.number().positive().nullable(),
  defaultThickness: z.number().positive().nullable(),
  defaultColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateElementPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required').max(100),
  type: ElementTypeSchema,
  defaultWidth: z.number().positive().optional(),
  defaultHeight: z.number().positive().optional(),
  defaultThickness: z.number().positive().optional(),
  defaultColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#666666'),
  icon: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateElementPresetSchema = CreateElementPresetSchema.partial();

// ============================================================================
// USER PREFERENCE SCHEMAS
// ============================================================================

export const UserPreferenceSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  farmId: z.string().cuid(),
  hasSeenLayoutTutorial: z.boolean().default(false),
  preferredUnit: UnitSystemSchema.default('FEET'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdateUserPreferenceSchema = z.object({
  hasSeenLayoutTutorial: z.boolean().optional(),
  preferredUnit: UnitSystemSchema.optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type LayoutElement = z.infer<typeof LayoutElementSchema>;
export type CreateLayoutElement = z.infer<typeof CreateLayoutElementSchema>;
export type UpdateLayoutElement = z.infer<typeof UpdateLayoutElementSchema>;
export type ElementPreset = z.infer<typeof ElementPresetSchema>;
export type CreateElementPreset = z.infer<typeof CreateElementPresetSchema>;
export type UpdateElementPreset = z.infer<typeof UpdateElementPresetSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type UpdateUserPreference = z.infer<typeof UpdateUserPreferenceSchema>;

// ============================================================================
// DEFAULT ELEMENT DIMENSIONS (in centimeters - base unit)
// ============================================================================

export const DEFAULT_ELEMENT_DIMENSIONS = {
  WALL: { thickness: 10 }, // ~4 inches
  DOOR: { width: 90, height: 10 }, // 3ft door, ~4 inches thick
  SINK: { width: 60, height: 45 }, // Standard utility sink
  TABLE: { width: 120, height: 60 }, // 4ft x 2ft table
  GROW_RACK: { width: 120, height: 60 }, // Standard grow rack footprint
  WALKWAY: { width: 90, height: 30 }, // 3ft x 1ft walkway section
  CIRCLE: { width: 60, height: 60 }, // Default circle diameter
} as const;

// Default colors for each element type
export const DEFAULT_ELEMENT_COLORS = {
  WALL: '#4a5568', // Gray
  DOOR: '#8b5a2b', // Brown (wood color)
  SINK: '#3182ce', // Blue
  TABLE: '#805ad5', // Purple
  GROW_RACK: '#38a169', // Green
  WALKWAY: '#d69e2e', // Yellow/orange for visibility
  CIRCLE: '#718096', // Gray
  CUSTOM: '#666666', // Default gray
} as const;
