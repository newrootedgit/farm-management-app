import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import paypal from '@paypal/checkout-server-sdk';
import { randomBytes } from 'crypto';
import {
  CreatePaymentIntentSchema,
  CreatePaymentLinkSchema,
  ProcessRefundSchema,
  UpdatePaymentSettingsSchema,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

// Initialize Stripe lazily (only when API key is available)
let stripeInstance: Stripe | null = null;

function getStripeClient(): Stripe | null {
  if (stripeInstance) return stripeInstance;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover' as const,
  });
  return stripeInstance;
}

function requireStripe(): Stripe {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new BadRequestError('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.');
  }
  return stripe;
}

// Initialize PayPal
function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const environment = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(environment);
}

// Demo user ID for development
const DEMO_USER_ID = 'demo-user-1';

// Generate a secure random payment link ID
function generatePaymentLinkId(): string {
  return randomBytes(16).toString('hex');
}

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper to get user ID
  const getUserId = (request: FastifyRequest): string => {
    if (request.userId) return request.userId;
    if (process.env.SKIP_AUTH === 'true') return DEMO_USER_ID;
    throw new Error('Unauthorized');
  };

  // ============================================================================
  // PAYMENT SETTINGS
  // ============================================================================

  // Get payment settings for a farm
  fastify.get('/farms/:farmId/payments/settings', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      // Get or create payment settings
      let settings = await fastify.prisma.paymentSettings.findUnique({
        where: { farmId },
      });

      if (!settings) {
        settings = await fastify.prisma.paymentSettings.create({
          data: { farmId },
        });
      }

      return {
        success: true,
        data: {
          ...settings,
          isConnected: settings.stripeAccountStatus === 'ACTIVE',
          canAcceptPayments: settings.stripeAccountStatus === 'ACTIVE' && settings.stripeOnboardingComplete,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update payment settings
  fastify.patch('/farms/:farmId/payments/settings', {
    preHandler: [requireAuth(), requireRole('OWNER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = UpdatePaymentSettingsSchema.parse(request.body);

      const settings = await fastify.prisma.paymentSettings.upsert({
        where: { farmId },
        update: data,
        create: { farmId, ...data },
      });

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // STRIPE CONNECT ONBOARDING
  // ============================================================================

  // Start Stripe Connect onboarding (OWNER only)
  fastify.post('/farms/:farmId/payments/stripe/connect', {
    preHandler: [requireAuth(), requireRole('OWNER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      // Get farm details
      const farm = await fastify.prisma.farm.findUnique({
        where: { id: farmId },
        include: { paymentSettings: true },
      });

      if (!farm) {
        throw new NotFoundError('Farm not found');
      }

      let stripeAccountId = farm.paymentSettings?.stripeAccountId;

      // Create Stripe account if doesn't exist
      const stripe = requireStripe();
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: farm.name,
          },
        });
        stripeAccountId = account.id;

        // Save the account ID
        await fastify.prisma.paymentSettings.upsert({
          where: { farmId },
          update: {
            stripeAccountId: account.id,
            stripeAccountStatus: 'PENDING',
          },
          create: {
            farmId,
            stripeAccountId: account.id,
            stripeAccountStatus: 'PENDING',
          },
        });
      }

      // Create account link for onboarding
      const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/payments?stripe_return=true`;
      const refreshUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/payments?stripe_refresh=true`;

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        success: true,
        data: {
          url: accountLink.url,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Refresh Stripe onboarding link (if user needs to continue)
  fastify.post('/farms/:farmId/payments/stripe/refresh', {
    preHandler: [requireAuth(), requireRole('OWNER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      const settings = await fastify.prisma.paymentSettings.findUnique({
        where: { farmId },
      });

      if (!settings?.stripeAccountId) {
        throw new BadRequestError('No Stripe account connected');
      }

      const stripe = requireStripe();
      const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/payments?stripe_return=true`;
      const refreshUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/payments?stripe_refresh=true`;

      const accountLink = await stripe.accountLinks.create({
        account: settings.stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        success: true,
        data: {
          url: accountLink.url,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Check Stripe account status
  fastify.get('/farms/:farmId/payments/stripe/status', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      const settings = await fastify.prisma.paymentSettings.findUnique({
        where: { farmId },
      });

      if (!settings?.stripeAccountId) {
        return {
          success: true,
          data: {
            status: 'NOT_CONNECTED',
            onboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false,
          },
        };
      }

      // Fetch account from Stripe
      const stripe = requireStripe();
      const account = await stripe.accounts.retrieve(settings.stripeAccountId);

      // Determine status
      let status = 'PENDING';
      if (account.charges_enabled && account.payouts_enabled) {
        status = 'ACTIVE';
      } else if (account.requirements?.disabled_reason) {
        status = 'RESTRICTED';
      }

      // Update our database
      await fastify.prisma.paymentSettings.update({
        where: { farmId },
        data: {
          stripeAccountStatus: status,
          stripeOnboardingComplete: account.details_submitted || false,
        },
      });

      return {
        success: true,
        data: {
          status,
          onboardingComplete: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Disconnect Stripe account (OWNER only)
  fastify.delete('/farms/:farmId/payments/stripe/disconnect', {
    preHandler: [requireAuth(), requireRole('OWNER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      const settings = await fastify.prisma.paymentSettings.findUnique({
        where: { farmId },
      });

      if (settings?.stripeAccountId) {
        // Note: In production, you might want to handle pending payments first
        // For now, we just update our database
        await fastify.prisma.paymentSettings.update({
          where: { farmId },
          data: {
            stripeAccountId: null,
            stripeAccountStatus: 'NOT_CONNECTED',
            stripeOnboardingComplete: false,
          },
        });
      }

      return {
        success: true,
        message: 'Stripe account disconnected',
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // PAYMENT COLLECTION
  // ============================================================================

  // Create payment intent for dashboard payment collection
  fastify.post('/farms/:farmId/orders/:orderId/payment-intent', {
    preHandler: [requireAuth(), requireRole('SALESPERSON')],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const data = CreatePaymentIntentSchema.parse(request.body);

      // Get payment settings
      const settings = await fastify.prisma.paymentSettings.findUnique({
        where: { farmId },
      });

      if (!settings?.stripeAccountId || settings.stripeAccountStatus !== 'ACTIVE') {
        throw new BadRequestError('Stripe account not connected or not active');
      }

      // Get order
      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Calculate platform fee (percentage of amount)
      const platformFee = Math.round(data.amount * (settings.platformFeePercent / 100));

      // Create payment intent with transfer to connected account
      const stripe = requireStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: data.amount,
        currency: 'usd',
        application_fee_amount: platformFee,
        transfer_data: {
          destination: settings.stripeAccountId,
        },
        metadata: {
          farmId,
          orderId,
          orderNumber: order.orderNumber,
        },
      });

      // Save payment record
      const payment = await fastify.prisma.payment.create({
        data: {
          farmId,
          orderId,
          stripePaymentIntentId: paymentIntent.id,
          amount: data.amount,
          platformFee,
          customerEmail: data.customerEmail || null,
          customerName: data.customerName || null,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        data: {
          paymentId: payment.id,
          clientSecret: paymentIntent.client_secret,
          amount: data.amount,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create shareable payment link
  fastify.post('/farms/:farmId/orders/:orderId/payment-link', {
    preHandler: [requireAuth(), requireRole('SALESPERSON')],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const data = CreatePaymentLinkSchema.parse(request.body);

      // Get payment settings
      const settings = await fastify.prisma.paymentSettings.findUnique({
        where: { farmId },
      });

      if (!settings?.stripeAccountId || settings.stripeAccountStatus !== 'ACTIVE') {
        throw new BadRequestError('Stripe account not connected or not active');
      }

      // Get order
      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Generate unique link ID
      const paymentLinkId = generatePaymentLinkId();
      const expiresAt = new Date(Date.now() + (data.expiresInHours || 72) * 60 * 60 * 1000);

      // Calculate platform fee
      const platformFee = Math.round(data.amount * (settings.platformFeePercent / 100));

      // Create payment record with link
      const payment = await fastify.prisma.payment.create({
        data: {
          farmId,
          orderId,
          amount: data.amount,
          platformFee,
          customerEmail: data.customerEmail || null,
          customerName: data.customerName || null,
          paymentLinkId,
          paymentLinkUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${paymentLinkId}`,
          paymentLinkExpiresAt: expiresAt,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        data: {
          paymentId: payment.id,
          paymentLinkId,
          url: payment.paymentLinkUrl,
          expiresAt,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // List payments for an order
  fastify.get('/farms/:farmId/orders/:orderId/payments', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      // Verify order belongs to farm
      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const payments = await fastify.prisma.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: payments,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Process refund (MANAGER+)
  fastify.post('/farms/:farmId/payments/:paymentId/refund', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, paymentId } = request.params as { farmId: string; paymentId: string };
      const data = ProcessRefundSchema.parse(request.body);

      // Get payment with order
      const payment = await fastify.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (!payment || !payment.order || payment.order.farmId !== farmId) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status !== 'SUCCEEDED') {
        throw new BadRequestError('Can only refund succeeded payments');
      }

      if (!payment.stripePaymentIntentId) {
        throw new BadRequestError('No Stripe payment intent associated');
      }

      // Process refund through Stripe
      const stripe = requireStripe();
      const refundAmount = data.amount || payment.amount;
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
      });

      // Update payment status
      const newStatus = refundAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await fastify.prisma.payment.update({
        where: { id: paymentId },
        data: { status: newStatus },
      });

      return {
        success: true,
        data: {
          refundId: refund.id,
          amount: refundAmount,
          status: newStatus,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // PUBLIC PAYMENT LINK ROUTES (No auth required)
  // ============================================================================

  // Get payment link details for checkout page
  fastify.get('/payment-link/:linkId', async (request, reply) => {
    try {
      const { linkId } = request.params as { linkId: string };

      const payment = await fastify.prisma.payment.findUnique({
        where: { paymentLinkId: linkId },
        include: {
          order: {
            include: {
              farm: {
                select: { id: true, name: true },
              },
              items: {
                include: {
                  product: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment || !payment.order) {
        throw new NotFoundError('Payment link not found');
      }

      // Check if expired
      if (payment.paymentLinkExpiresAt && new Date() > payment.paymentLinkExpiresAt) {
        return {
          success: false,
          error: 'Payment link has expired',
          expired: true,
        };
      }

      // Check if already paid
      if (payment.status === 'SUCCEEDED') {
        return {
          success: true,
          data: {
            status: 'ALREADY_PAID',
            paidAt: payment.paidAt,
          },
        };
      }

      return {
        success: true,
        data: {
          id: payment.id,
          orderNumber: payment.order.orderNumber,
          farmName: payment.order.farm.name,
          farmId: payment.order.farm.id,
          amount: payment.amount,
          currency: payment.currency,
          customerEmail: payment.customerEmail,
          customerName: payment.customerName,
          status: payment.status,
          expiresAt: payment.paymentLinkExpiresAt,
          items: payment.order.items.map(item => ({
            productName: item.product.name,
            quantityOz: item.quantityOz,
            lineTotal: null, // Line totals not stored on order items
          })),
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create payment intent for payment link checkout
  fastify.post('/payment-link/:linkId/pay', async (request, reply) => {
    try {
      const { linkId } = request.params as { linkId: string };

      const payment = await fastify.prisma.payment.findUnique({
        where: { paymentLinkId: linkId },
        include: {
          order: {
            include: {
              farm: {
                include: {
                  paymentSettings: true,
                },
              },
            },
          },
        },
      });

      if (!payment || !payment.order) {
        throw new NotFoundError('Payment link not found');
      }

      // Check if expired
      if (payment.paymentLinkExpiresAt && new Date() > payment.paymentLinkExpiresAt) {
        throw new BadRequestError('Payment link has expired');
      }

      // Check if already paid
      if (payment.status === 'SUCCEEDED') {
        throw new BadRequestError('This payment has already been completed');
      }

      const settings = payment.order.farm.paymentSettings;
      if (!settings?.stripeAccountId) {
        throw new BadRequestError('Stripe account not connected');
      }

      // Create payment intent
      const stripe = requireStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: payment.amount,
        currency: payment.currency,
        application_fee_amount: payment.platformFee ?? undefined,
        transfer_data: {
          destination: settings.stripeAccountId,
        },
        metadata: {
          farmId: payment.order.farmId,
          orderId: payment.orderId ?? '',
          orderNumber: payment.order.orderNumber,
          paymentId: payment.id,
          paymentLinkId: linkId,
        },
      });

      // Update payment with Stripe payment intent ID
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: 'PROCESSING',
        },
      });

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          stripeAccountId: settings.stripeAccountId,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // STRIPE WEBHOOKS
  // ============================================================================

  // Handle Stripe webhooks
  fastify.post('/webhooks/stripe', {
    config: {
      rawBody: true,
    },
  }, async (request, reply) => {
    try {
      const sig = request.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        fastify.log.error('STRIPE_WEBHOOK_SECRET not configured');
        return reply.status(500).send({ error: 'Webhook secret not configured' });
      }

      let event: Stripe.Event;
      const stripe = getStripeClient();

      if (!stripe) {
        fastify.log.error('Stripe not configured');
        return reply.status(500).send({ error: 'Stripe not configured' });
      }

      try {
        // Get raw body for signature verification
        const rawBody = (request as any).rawBody || request.body;
        event = stripe.webhooks.constructEvent(
          typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
          sig,
          webhookSecret
        );
      } catch (err: any) {
        fastify.log.error('Webhook signature verification failed:', err.message);
        return reply.status(400).send({ error: 'Webhook signature verification failed' });
      }

      // Check if we've already processed this event
      const existingEvent = await fastify.prisma.stripeWebhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      if (existingEvent?.processed) {
        return { received: true, already_processed: true };
      }

      // Log the event
      await fastify.prisma.stripeWebhookEvent.upsert({
        where: { stripeEventId: event.id },
        update: {},
        create: {
          stripeEventId: event.id,
          eventType: event.type,
        },
      });

      // Handle the event
      try {
        switch (event.type) {
          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            // Find and update the payment
            const payment = await fastify.prisma.payment.findFirst({
              where: { stripePaymentIntentId: paymentIntent.id },
              include: { order: true },
            });

            if (payment) {
              await fastify.prisma.payment.update({
                where: { id: payment.id },
                data: {
                  status: 'SUCCEEDED',
                  paidAt: new Date(),
                },
              });

              // Update order payment status if linked
              if (payment.orderId) {
                await fastify.prisma.order.update({
                  where: { id: payment.orderId },
                  data: {
                    paymentStatus: 'SUCCEEDED',
                  },
                });
              }
            }
            break;
          }

          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            const payment = await fastify.prisma.payment.findFirst({
              where: { stripePaymentIntentId: paymentIntent.id },
            });

            if (payment) {
              await fastify.prisma.payment.update({
                where: { id: payment.id },
                data: {
                  status: 'FAILED',
                  failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
                },
              });
            }
            break;
          }

          case 'account.updated': {
            const account = event.data.object as Stripe.Account;

            // Find farm with this Stripe account
            const settings = await fastify.prisma.paymentSettings.findFirst({
              where: { stripeAccountId: account.id },
            });

            if (settings) {
              let status = 'PENDING';
              if (account.charges_enabled && account.payouts_enabled) {
                status = 'ACTIVE';
              } else if (account.requirements?.disabled_reason) {
                status = 'RESTRICTED';
              }

              await fastify.prisma.paymentSettings.update({
                where: { id: settings.id },
                data: {
                  stripeAccountStatus: status,
                  stripeOnboardingComplete: account.details_submitted || false,
                },
              });
            }
            break;
          }
        }

        // Mark event as processed
        await fastify.prisma.stripeWebhookEvent.update({
          where: { stripeEventId: event.id },
          data: { processed: true },
        });

      } catch (processError: any) {
        // Log the error but don't fail the webhook
        await fastify.prisma.stripeWebhookEvent.update({
          where: { stripeEventId: event.id },
          data: { error: processError.message },
        });
        fastify.log.error('Error processing webhook:', processError);
      }

      return { received: true };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // PAYPAL INTEGRATION
  // ============================================================================

  // Create PayPal order for payment link checkout
  fastify.post('/payment-link/:linkId/paypal/create-order', async (request, reply) => {
    try {
      const { linkId } = request.params as { linkId: string };
      const paypalClient = getPayPalClient();

      if (!paypalClient) {
        throw new BadRequestError('PayPal is not configured');
      }

      const payment = await fastify.prisma.payment.findUnique({
        where: { paymentLinkId: linkId },
        include: {
          order: {
            include: {
              farm: {
                include: {
                  paymentSettings: true,
                },
              },
            },
          },
        },
      });

      if (!payment || !payment.order) {
        throw new NotFoundError('Payment link not found');
      }

      // Check if expired
      if (payment.paymentLinkExpiresAt && new Date() > payment.paymentLinkExpiresAt) {
        throw new BadRequestError('Payment link has expired');
      }

      // Check if already paid
      if (payment.status === 'SUCCEEDED') {
        throw new BadRequestError('This payment has already been completed');
      }

      // Convert cents to dollars for PayPal
      const amountInDollars = (payment.amount / 100).toFixed(2);

      // Create PayPal order
      const orderRequest = new paypal.orders.OrdersCreateRequest();
      orderRequest.prefer('return=representation');
      orderRequest.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: payment.id,
            description: `Order #${payment.order.orderNumber}`,
            amount: {
              currency_code: payment.currency.toUpperCase(),
              value: amountInDollars,
            },
          },
        ],
        application_context: {
          brand_name: payment.order.farm.name,
          shipping_preference: 'NO_SHIPPING',
        },
      });

      const orderResponse = await paypalClient.execute<paypal.PayPalOrderResult>(orderRequest);
      const paypalOrderId = orderResponse.result.id;

      // Update payment with PayPal order ID
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paypalOrderId,
          processor: 'PAYPAL',
          status: 'PROCESSING',
        },
      });

      return {
        success: true,
        data: {
          orderId: paypalOrderId,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Capture PayPal payment
  fastify.post('/payment-link/:linkId/paypal/capture', async (request, reply) => {
    try {
      const { linkId } = request.params as { linkId: string };
      const { orderId } = request.body as { orderId: string };
      const paypalClient = getPayPalClient();

      if (!paypalClient) {
        throw new BadRequestError('PayPal is not configured');
      }

      if (!orderId) {
        throw new BadRequestError('PayPal order ID is required');
      }

      const payment = await fastify.prisma.payment.findUnique({
        where: { paymentLinkId: linkId },
        include: {
          order: true,
        },
      });

      if (!payment) {
        throw new NotFoundError('Payment link not found');
      }

      // Verify PayPal order matches
      if (payment.paypalOrderId !== orderId) {
        throw new BadRequestError('PayPal order ID mismatch');
      }

      // Capture the payment
      const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
      captureRequest.requestBody({});

      const captureResponse = await paypalClient.execute<paypal.PayPalOrderResult>(captureRequest);

      if (captureResponse.result.status === 'COMPLETED') {
        // Update payment status
        await fastify.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCEEDED',
            paidAt: new Date(),
          },
        });

        // Update order payment status if linked
        if (payment.orderId) {
          await fastify.prisma.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: 'SUCCEEDED',
            },
          });
        }

        return {
          success: true,
          data: {
            status: 'COMPLETED',
            captureId: captureResponse.result.purchase_units[0]?.payments?.captures?.[0]?.id,
          },
        };
      } else {
        throw new BadRequestError('Payment capture failed');
      }
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get PayPal client ID for frontend
  fastify.get('/payment-link/:linkId/paypal/config', async (request, reply) => {
    try {
      const { linkId } = request.params as { linkId: string };

      const payment = await fastify.prisma.payment.findUnique({
        where: { paymentLinkId: linkId },
        include: {
          order: {
            include: {
              farm: {
                include: {
                  paymentSettings: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundError('Payment link not found');
      }

      // Return PayPal client ID from env (in production, this would be merchant-specific)
      const clientId = process.env.PAYPAL_CLIENT_ID;

      return {
        success: true,
        data: {
          clientId: clientId || null,
          isConfigured: !!clientId,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default paymentsRoutes;
