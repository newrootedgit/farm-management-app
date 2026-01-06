import { z } from 'zod';

// ============================================================================
// BLEND INGREDIENT SCHEMAS
// ============================================================================

export const BlendIngredientSchema = z.object({
  id: z.string().cuid(),
  blendId: z.string().cuid(),
  productId: z.string().cuid(),
  ratioPercent: z.number().min(0).max(100),
  overrideDaysSoaking: z.number().int().nullable(),
  overrideDaysGermination: z.number().int().nullable(),
  overrideDaysLight: z.number().int().nullable(),
  displayOrder: z.number().int(),
});

export const CreateBlendIngredientSchema = z.object({
  productId: z.string().cuid('Product is required'),
  ratioPercent: z.number().min(0.1, 'Ratio must be at least 0.1%').max(100),
  overrideDaysSoaking: z.number().int().optional(),
  overrideDaysGermination: z.number().int().optional(),
  overrideDaysLight: z.number().int().optional(),
});

// ============================================================================
// BLEND SCHEMAS
// ============================================================================

export const BlendSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  productId: z.string().cuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBlendSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  ingredients: z.array(CreateBlendIngredientSchema)
    .min(2, 'A blend must have at least 2 ingredients'),
}).refine((data) => {
  const total = data.ingredients.reduce((sum, i) => sum + i.ratioPercent, 0);
  return Math.abs(total - 100) < 0.1; // Allow small floating point variance
}, {
  message: 'Ingredient ratios must sum to 100%',
  path: ['ingredients'],
});

export const UpdateBlendSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  ingredients: z.array(CreateBlendIngredientSchema).optional(),
}).refine((data) => {
  if (data.ingredients) {
    const total = data.ingredients.reduce((sum, i) => sum + i.ratioPercent, 0);
    return Math.abs(total - 100) < 0.1;
  }
  return true;
}, {
  message: 'Ingredient ratios must sum to 100%',
  path: ['ingredients'],
});

// ============================================================================
// BLEND ORDER INSTANCE SCHEMAS (for tracking production)
// ============================================================================

export const BlendIngredientYieldSchema = z.object({
  id: z.string().cuid(),
  blendInstanceId: z.string().cuid(),
  productId: z.string().cuid(),
  targetOz: z.number().positive(),
  actualYieldOz: z.number().positive().nullable(),
  traysUsed: z.number().int().positive().nullable(),
  harvestedAt: z.date().nullable(),
  harvestedBy: z.string().nullable(),
  notes: z.string().nullable(),
});

export const BlendOrderInstanceSchema = z.object({
  id: z.string().cuid(),
  blendId: z.string().cuid(),
  orderItemId: z.string().cuid(),
  ingredientTargets: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    targetOz: z.number(),
    traysNeeded: z.number(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RecordBlendIngredientYieldSchema = z.object({
  productId: z.string().cuid(),
  actualYieldOz: z.number().positive('Yield must be positive'),
  traysUsed: z.number().int().positive().optional(),
  harvestedBy: z.string().min(1, 'Name is required'),
  notes: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type Blend = z.infer<typeof BlendSchema>;
export type BlendIngredient = z.infer<typeof BlendIngredientSchema>;
export type CreateBlend = z.infer<typeof CreateBlendSchema>;
export type UpdateBlend = z.infer<typeof UpdateBlendSchema>;
export type CreateBlendIngredient = z.infer<typeof CreateBlendIngredientSchema>;
export type BlendOrderInstance = z.infer<typeof BlendOrderInstanceSchema>;
export type BlendIngredientYield = z.infer<typeof BlendIngredientYieldSchema>;
export type RecordBlendIngredientYield = z.infer<typeof RecordBlendIngredientYieldSchema>;

// Extended types with relations
export interface BlendWithRelations extends Blend {
  product: {
    id: string;
    name: string;
    sku: string | null;
  };
  ingredients: Array<BlendIngredient & {
    product: {
      id: string;
      name: string;
      avgYieldPerTray: number | null;
      daysSoaking: number | null;
      daysGermination: number | null;
      daysLight: number | null;
    };
  }>;
}

// BlendProductionSchedule is exported from production-calculator.ts
// Re-export here for convenience
export type { BlendProductionSchedule } from '../utils/production-calculator';
