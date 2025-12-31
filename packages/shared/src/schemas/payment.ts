import { z } from 'zod';

// ============================================================================
// PAYMENT STATUS ENUMS
// ============================================================================

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELLED',
]);

export const PaymentTimingSchema = z.enum([
  'UPFRONT',
  'ON_READY',
]);

export const StripeAccountStatusSchema = z.enum([
  'NOT_CONNECTED',
  'PENDING',
  'ACTIVE',
  'RESTRICTED',
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentTiming = z.infer<typeof PaymentTimingSchema>;
export type StripeAccountStatus = z.infer<typeof StripeAccountStatusSchema>;

// ============================================================================
// PAYMENT SETTINGS SCHEMAS
// ============================================================================

export const PaymentSettingsSchema = z.object({
  id: z.string().cuid(),
  farmId: z.string().cuid(),
  stripeAccountId: z.string().nullable(),
  stripeAccountStatus: z.string(),
  stripeOnboardingComplete: z.boolean(),
  platformFeePercent: z.number().min(0).max(100),
  paymentTiming: z.string(),
  preferredProcessor: z.string(),
  paypalMerchantId: z.string().nullable(),
  paypalClientId: z.string().nullable(),
  paypalAccountStatus: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdatePaymentSettingsSchema = z.object({
  paymentTiming: PaymentTimingSchema.optional(),
  preferredProcessor: z.enum(['STRIPE', 'PAYPAL']).optional(),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const PaymentSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string().cuid(),
  stripePaymentIntentId: z.string().nullable(),
  stripeCheckoutSessionId: z.string().nullable(),
  amount: z.number().int().positive(),
  currency: z.string().default('usd'),
  status: z.string(),
  platformFee: z.number().int().min(0),
  customerEmail: z.string().email().nullable(),
  customerName: z.string().nullable(),
  paymentLinkId: z.string().nullable(),
  paymentLinkUrl: z.string().url().nullable(),
  paymentLinkExpiresAt: z.date().nullable(),
  paidAt: z.date().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// For creating a payment intent (dashboard payment collection)
export const CreatePaymentIntentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
});

// For creating a shareable payment link
export const CreatePaymentLinkSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  expiresInHours: z.number().int().positive().default(72), // Default 72 hours
});

// For processing a refund
export const ProcessRefundSchema = z.object({
  amount: z.number().int().positive().optional(), // If not provided, full refund
  reason: z.string().optional(),
});

// ============================================================================
// STRIPE CONNECT SCHEMAS
// ============================================================================

export const StripeConnectResponseSchema = z.object({
  url: z.string().url(),
});

export const StripeOAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

// ============================================================================
// PUBLIC PAYMENT LINK SCHEMAS
// ============================================================================

export const PaymentLinkDetailsSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  farmName: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  customerEmail: z.string().email().nullable(),
  customerName: z.string().nullable(),
  status: z.string(),
  expiresAt: z.date().nullable(),
  items: z.array(z.object({
    productName: z.string(),
    quantityOz: z.number(),
    lineTotal: z.number().nullable(),
  })),
});

// ============================================================================
// TYPES
// ============================================================================

export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;
export type UpdatePaymentSettings = z.infer<typeof UpdatePaymentSettingsSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type CreatePaymentIntent = z.infer<typeof CreatePaymentIntentSchema>;
export type CreatePaymentLink = z.infer<typeof CreatePaymentLinkSchema>;
export type ProcessRefund = z.infer<typeof ProcessRefundSchema>;
export type StripeConnectResponse = z.infer<typeof StripeConnectResponseSchema>;
export type StripeOAuthCallback = z.infer<typeof StripeOAuthCallbackSchema>;
export type PaymentLinkDetails = z.infer<typeof PaymentLinkDetailsSchema>;

// Extended types with relations
export interface PaymentWithOrder extends Payment {
  order: {
    id: string;
    orderNumber: string;
    customer: string | null;
    status: string;
  };
}

export interface PaymentSettingsWithStatus extends PaymentSettings {
  isConnected: boolean;
  canAcceptPayments: boolean;
}
