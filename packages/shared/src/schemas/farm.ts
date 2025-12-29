import { z } from 'zod';

// Farm schemas
export const FarmSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  companyId: z.string().cuid().nullable(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFarmSchema = z.object({
  name: z.string().min(1, 'Farm name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

export const UpdateFarmSchema = CreateFarmSchema.partial();

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
