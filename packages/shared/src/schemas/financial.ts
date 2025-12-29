import { z } from 'zod';

// Account and transaction types
export const AccountTypeSchema = z.enum(['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY']);
export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);
export const BudgetStatusSchema = z.enum(['DRAFT', 'APPROVED', 'CLOSED']);

export type AccountType = z.infer<typeof AccountTypeSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;

// Financial Account schemas
export const FinancialAccountSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: AccountTypeSchema,
  code: z.string().nullable(),
  parentId: z.string().cuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFinancialAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: AccountTypeSchema,
  code: z.string().optional(),
  parentId: z.string().cuid().optional(),
});

export const UpdateFinancialAccountSchema = CreateFinancialAccountSchema.partial();

// Financial Transaction schemas
export const FinancialTransactionSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  accountId: z.string().cuid(),
  date: z.date(),
  amount: z.number(),
  type: TransactionTypeSchema,
  description: z.string().nullable(),
  reference: z.string().nullable(),
  category: z.string().nullable(),
  zoneId: z.string().cuid().nullable(),
  productId: z.string().cuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFinancialTransactionSchema = z.object({
  accountId: z.string().cuid(),
  date: z.date(),
  amount: z.number().positive('Amount must be positive'),
  type: TransactionTypeSchema,
  description: z.string().optional(),
  reference: z.string().optional(),
  category: z.string().optional(),
  zoneId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
});

export const UpdateFinancialTransactionSchema = CreateFinancialTransactionSchema.partial();

// Budget schemas
export const BudgetSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  name: z.string().min(1).max(100),
  year: z.number().int().min(2020).max(2100),
  status: BudgetStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100),
  year: z.number().int().min(2020).max(2100),
  status: BudgetStatusSchema.default('DRAFT'),
});

export const UpdateBudgetSchema = CreateBudgetSchema.partial();

// Budget Item schemas
export const BudgetItemSchema = z.object({
  id: z.string().cuid(),
  budgetId: z.string().cuid(),
  accountId: z.string().cuid(),
  jan: z.number(),
  feb: z.number(),
  mar: z.number(),
  apr: z.number(),
  may: z.number(),
  jun: z.number(),
  jul: z.number(),
  aug: z.number(),
  sep: z.number(),
  oct: z.number(),
  nov: z.number(),
  dec: z.number(),
  notes: z.string().nullable(),
});

export const CreateBudgetItemSchema = z.object({
  accountId: z.string().cuid(),
  jan: z.number().default(0),
  feb: z.number().default(0),
  mar: z.number().default(0),
  apr: z.number().default(0),
  may: z.number().default(0),
  jun: z.number().default(0),
  jul: z.number().default(0),
  aug: z.number().default(0),
  sep: z.number().default(0),
  oct: z.number().default(0),
  nov: z.number().default(0),
  dec: z.number().default(0),
  notes: z.string().optional(),
});

export const UpdateBudgetItemSchema = CreateBudgetItemSchema.partial();

// Types
export type FinancialAccount = z.infer<typeof FinancialAccountSchema>;
export type CreateFinancialAccount = z.infer<typeof CreateFinancialAccountSchema>;
export type UpdateFinancialAccount = z.infer<typeof UpdateFinancialAccountSchema>;
export type FinancialTransaction = z.infer<typeof FinancialTransactionSchema>;
export type CreateFinancialTransaction = z.infer<typeof CreateFinancialTransactionSchema>;
export type UpdateFinancialTransaction = z.infer<typeof UpdateFinancialTransactionSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type CreateBudget = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudget = z.infer<typeof UpdateBudgetSchema>;
export type BudgetItem = z.infer<typeof BudgetItemSchema>;
export type CreateBudgetItem = z.infer<typeof CreateBudgetItemSchema>;
export type UpdateBudgetItem = z.infer<typeof UpdateBudgetItemSchema>;
