import { z } from 'zod';

// Wiki Space schemas
export const WikiSpaceSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  icon: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateWikiSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  icon: z.string().optional(),
});

export const UpdateWikiSpaceSchema = CreateWikiSpaceSchema.partial();

// Wiki Page schemas
export const WikiPageSchema = z.object({
  id: z.string().cuid(),
  spaceId: z.string().cuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  content: z.any(), // TipTap JSON content
  parentId: z.string().cuid().nullable(),
  author: z.string().cuid(),
  published: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateWikiPageSchema = z.object({
  title: z.string().min(1, 'Page title is required').max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  content: z.any(), // TipTap JSON content
  parentId: z.string().cuid().optional(),
  published: z.boolean().default(false),
});

export const UpdateWikiPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  content: z.any().optional(),
  parentId: z.string().cuid().nullable().optional(),
  published: z.boolean().optional(),
});

// Wiki Revision schemas
export const WikiRevisionSchema = z.object({
  id: z.string().cuid(),
  pageId: z.string().cuid(),
  content: z.any(),
  author: z.string().cuid(),
  comment: z.string().nullable(),
  createdAt: z.date(),
});

// Wiki Tag schemas
export const WikiTagSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(50),
});

export const CreateWikiTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
});

// Types
export type WikiSpace = z.infer<typeof WikiSpaceSchema>;
export type CreateWikiSpace = z.infer<typeof CreateWikiSpaceSchema>;
export type UpdateWikiSpace = z.infer<typeof UpdateWikiSpaceSchema>;
export type WikiPage = z.infer<typeof WikiPageSchema>;
export type CreateWikiPage = z.infer<typeof CreateWikiPageSchema>;
export type UpdateWikiPage = z.infer<typeof UpdateWikiPageSchema>;
export type WikiRevision = z.infer<typeof WikiRevisionSchema>;
export type WikiTag = z.infer<typeof WikiTagSchema>;
export type CreateWikiTag = z.infer<typeof CreateWikiTagSchema>;
