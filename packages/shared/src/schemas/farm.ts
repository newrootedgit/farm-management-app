import { z } from 'zod';

// Weight unit options: oz, g, lb, kg
export const WeightUnitSchema = z.enum(['oz', 'g', 'lb', 'kg']);

// Length unit options: in, ft, cm, m
export const LengthUnitSchema = z.enum(['in', 'ft', 'cm', 'm']);

// Farm schemas
export const FarmSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  companyId: z.string().cuid().nullable(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  logoUrl: z.string().nullable().optional(),
  brandColor: z.string().nullable().optional(),
  weightUnit: WeightUnitSchema.default('oz'),
  lengthUnit: LengthUnitSchema.default('in'),
  // Contact Information (for document headers)
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  // Business Address
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().default('US'),
  // Document Settings
  invoicePrefix: z.string().default('INV'),
  nextInvoiceNumber: z.number().int().positive().default(1),
  invoiceFooterNotes: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFarmSchema = z.object({
  name: z.string().min(1, 'Farm name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  weightUnit: WeightUnitSchema.optional(),
  lengthUnit: LengthUnitSchema.optional(),
  // Contact Information
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  // Business Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const UpdateFarmSchema = CreateFarmSchema.partial().extend({
  // Document settings (admin-only in production)
  invoicePrefix: z.string().min(1).max(10).optional(),
  nextInvoiceNumber: z.number().int().positive().optional(),
  invoiceFooterNotes: z.string().nullable().optional(),
});

// Company schemas
export const CompanySchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});

// Types
export type Farm = z.infer<typeof FarmSchema>;
export type CreateFarm = z.infer<typeof CreateFarmSchema>;
export type UpdateFarm = z.infer<typeof UpdateFarmSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type CreateCompany = z.infer<typeof CreateCompanySchema>;
