import { z } from 'zod';

// Package Type schema
export const PackageTypeSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(10).toUpperCase(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePackageTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  code: z.string().min(1, 'Code is required').max(10).toUpperCase(),
  isActive: z.boolean().optional(),
});

export const UpdatePackageTypeSchema = CreatePackageTypeSchema.partial();

// Types
export type PackageType = z.infer<typeof PackageTypeSchema>;
export type CreatePackageType = z.input<typeof CreatePackageTypeSchema>;
export type UpdatePackageType = z.input<typeof UpdatePackageTypeSchema>;
