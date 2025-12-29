import { z } from 'zod';

// User roles
export const FarmRoleSchema = z.enum(['OWNER', 'MANAGER', 'EMPLOYEE', 'VIEWER']);
export type FarmRole = z.infer<typeof FarmRoleSchema>;

// User schemas
export const UserSchema = z.object({
  id: z.string().cuid(),
  externalId: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FarmUserSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  farmId: z.string().cuid(),
  role: FarmRoleSchema,
  createdAt: z.date(),
});

export const InviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: FarmRoleSchema.default('EMPLOYEE'),
});

export const UpdateFarmUserRoleSchema = z.object({
  role: FarmRoleSchema,
});

// Types
export type User = z.infer<typeof UserSchema>;
export type FarmUser = z.infer<typeof FarmUserSchema>;
export type InviteUser = z.infer<typeof InviteUserSchema>;
export type UpdateFarmUserRole = z.infer<typeof UpdateFarmUserRoleSchema>;
