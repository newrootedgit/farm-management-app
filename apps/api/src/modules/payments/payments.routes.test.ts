import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import paymentsRoutes from './payments.routes.js';

// Test fixtures
const testFarm = {
  id: 'test-farm-id-123',
  name: 'Test Farm',
  slug: 'test-farm',
};

const testPaymentSettings = {
  id: 'test-settings-id',
  farmId: 'test-farm-id-123',
  stripeAccountId: 'acct_123456',
  stripeAccountStatus: 'ACTIVE',
  stripeOnboardingComplete: true,
  paypalEnabled: false,
  platformFeePercent: 2.9,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testOrder = {
  id: 'test-order-id-123',
  farmId: 'test-farm-id-123',
  orderNumber: 'ORD-00001',
  customerId: 'test-customer-id',
  customerName: 'Test Customer',
  status: 'PENDING',
  farm: testFarm,
};

const testPayment = {
  id: 'test-payment-id-123',
  farmId: 'test-farm-id-123',
  orderId: 'test-order-id-123',
  stripePaymentIntentId: 'pi_123456',
  paypalOrderId: null,
  processor: 'STRIPE',
  amount: 5999,
  currency: 'usd',
  platformFee: 174,
  customerEmail: 'customer@example.com',
  customerName: 'Test Customer',
  status: 'PENDING',
  paymentLinkId: 'link-123',
  paymentLinkUrl: 'http://localhost:5173/pay/link-123',
  paymentLinkExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  paidAt: null,
  failureReason: null,
  order: testOrder,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Create mock Prisma
function createMockPrisma() {
  return {
    farm: {
      findUnique: vi.fn(),
    },
    paymentSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stripeWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    farmUser: {
      findUnique: vi.fn(),
    },
  };
}

// Build test app
async function buildTestApp(mockPrisma: ReturnType<typeof createMockPrisma>): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('prisma', mockPrisma);
  app.decorateRequest('userId', 'demo-user-1');
  app.decorateRequest('farmId', undefined);
  app.decorateRequest('farmRole', undefined);

  app.addHook('preHandler', async (request) => {
    const params = request.params as { farmId?: string };
    if (params.farmId) {
      request.farmId = params.farmId;
      request.farmRole = 'OWNER';
    }
  });

  await app.register(paymentsRoutes);
  return app;
}

describe('Payments Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
  });

  afterEach(async () => {
    await app.close();
  });

  // ========== PAYMENT SETTINGS ==========
  describe('GET /farms/:farmId/payments/settings', () => {
    it('should get payment settings', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(testPaymentSettings);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/payments/settings',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.isConnected).toBe(true);
      expect(body.data.canAcceptPayments).toBe(true);
    });

    it('should create default settings if none exist', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(null);
      mockPrisma.paymentSettings.create.mockResolvedValue({
        ...testPaymentSettings,
        stripeAccountId: null,
        stripeAccountStatus: 'NOT_CONNECTED',
        stripeOnboardingComplete: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/payments/settings',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.isConnected).toBe(false);
    });
  });

  describe('PATCH /farms/:farmId/payments/settings', () => {
    it('should update payment settings', async () => {
      mockPrisma.paymentSettings.upsert.mockResolvedValue({
        ...testPaymentSettings,
        paypalEnabled: true,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/payments/settings',
        payload: { paypalEnabled: true },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== STRIPE STATUS ==========
  describe('GET /farms/:farmId/payments/stripe/status', () => {
    it('should return NOT_CONNECTED when no account', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/payments/stripe/status',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('NOT_CONNECTED');
    });
  });

  // ========== PAYMENT LISTS ==========
  describe('GET /farms/:farmId/orders/:orderId/payments', () => {
    it('should list payments for an order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(testOrder);
      mockPrisma.payment.findMany.mockResolvedValue([testPayment]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/orders/test-order-id-123/payments',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/orders/non-existent/payments',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== PUBLIC PAYMENT LINK ROUTES ==========
  describe('GET /payment-link/:linkId', () => {
    it('should get payment link details', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        order: {
          ...testOrder,
          farm: { id: testFarm.id, name: testFarm.name },
          items: [
            {
              product: { name: 'Test Product' },
              quantityOz: 8,
            },
          ],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/payment-link/link-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.farmName).toBe('Test Farm');
      expect(body.data.amount).toBe(5999);
    });

    it('should return 404 for non-existent link', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-link/invalid-link',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should indicate expired link', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        paymentLinkExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        order: {
          ...testOrder,
          farm: { id: testFarm.id, name: testFarm.name },
          items: [],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/payment-link/expired-link',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.expired).toBe(true);
    });

    it('should indicate already paid', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        status: 'SUCCEEDED',
        paidAt: new Date(),
        order: {
          ...testOrder,
          farm: { id: testFarm.id, name: testFarm.name },
          items: [],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/payment-link/paid-link',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ALREADY_PAID');
    });
  });

  // ========== PAYMENT LINK PAY ==========
  describe('POST /payment-link/:linkId/pay', () => {
    it('should return 404 for non-existent link', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/payment-link/invalid-link/pay',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for expired link', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        paymentLinkExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        order: {
          ...testOrder,
          farm: {
            ...testFarm,
            paymentSettings: testPaymentSettings,
          },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/payment-link/expired-link/pay',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for already paid link', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        status: 'SUCCEEDED',
        order: {
          ...testOrder,
          farm: {
            ...testFarm,
            paymentSettings: testPaymentSettings,
          },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/payment-link/paid-link/pay',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ========== PAYPAL CONFIG ==========
  describe('GET /payment-link/:linkId/paypal/config', () => {
    it('should return PayPal config', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        order: {
          ...testOrder,
          farm: {
            ...testFarm,
            paymentSettings: testPaymentSettings,
          },
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/payment-link/link-123/paypal/config',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent link', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/payment-link/invalid-link/paypal/config',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== STRIPE DISCONNECT ==========
  describe('DELETE /farms/:farmId/payments/stripe/disconnect', () => {
    it('should disconnect Stripe account', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(testPaymentSettings);
      mockPrisma.paymentSettings.update.mockResolvedValue({
        ...testPaymentSettings,
        stripeAccountId: null,
        stripeAccountStatus: 'NOT_CONNECTED',
        stripeOnboardingComplete: false,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/payments/stripe/disconnect',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Stripe account disconnected');
    });

    it('should succeed even with no connected account', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/payments/stripe/disconnect',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== STRIPE CONNECT ==========
  describe('POST /farms/:farmId/payments/stripe/connect', () => {
    it('should return 400 when Stripe is not configured', async () => {
      mockPrisma.farm.findUnique.mockResolvedValue({
        ...testFarm,
        paymentSettings: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/stripe/connect',
      });

      // Returns 400 because STRIPE_SECRET_KEY is not set
      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent farm', async () => {
      mockPrisma.farm.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/stripe/connect',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== STRIPE REFRESH ==========
  describe('POST /farms/:farmId/payments/stripe/refresh', () => {
    it('should return 400 when no Stripe account connected', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/stripe/refresh',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when account has no stripeAccountId', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue({
        ...testPaymentSettings,
        stripeAccountId: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/stripe/refresh',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ========== CREATE PAYMENT INTENT ==========
  describe('POST /farms/:farmId/orders/:orderId/payment-intent', () => {
    it('should return 400 when Stripe not connected', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/orders/test-order-id-123/payment-intent',
        payload: {
          amount: 5999,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when Stripe account not active', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue({
        ...testPaymentSettings,
        stripeAccountStatus: 'PENDING',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/orders/test-order-id-123/payment-intent',
        payload: {
          amount: 5999,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(testPaymentSettings);
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/orders/non-existent/payment-intent',
        payload: {
          amount: 5999,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== CREATE PAYMENT LINK ==========
  describe('POST /farms/:farmId/orders/:orderId/payment-link', () => {
    it('should return 400 when Stripe not connected', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/orders/test-order-id-123/payment-link',
        payload: {
          amount: 5999,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(testPaymentSettings);
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/orders/non-existent/payment-link',
        payload: {
          amount: 5999,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should create a payment link', async () => {
      mockPrisma.paymentSettings.findUnique.mockResolvedValue(testPaymentSettings);
      mockPrisma.order.findFirst.mockResolvedValue(testOrder);
      mockPrisma.payment.create.mockImplementation(async (args: any) => {
        return {
          ...testPayment,
          id: 'new-payment-id',
          paymentLinkId: args.data.paymentLinkId,
          paymentLinkUrl: args.data.paymentLinkUrl,
          paymentLinkExpiresAt: args.data.paymentLinkExpiresAt,
        };
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/orders/test-order-id-123/payment-link',
        payload: {
          amount: 5999,
          customerEmail: 'customer@example.com',
          customerName: 'Test Customer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.paymentLinkId).toBeDefined();
      expect(body.data.url).toContain('/pay/');
      expect(body.data.expiresAt).toBeDefined();
    });
  });

  // ========== REFUND ==========
  describe('POST /farms/:farmId/payments/:paymentId/refund', () => {
    it('should return 404 for non-existent payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/non-existent/refund',
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for non-succeeded payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        status: 'PENDING',
        order: testOrder,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/test-payment-id-123/refund',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for payment without Stripe intent', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...testPayment,
        status: 'SUCCEEDED',
        stripePaymentIntentId: null,
        order: testOrder,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/payments/test-payment-id-123/refund',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ========== PAYPAL CREATE ORDER ==========
  describe('POST /payment-link/:linkId/paypal/create-order', () => {
    it('should return 400 when PayPal not configured', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payment-link/link-123/paypal/create-order',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ========== PAYPAL CAPTURE ==========
  describe('POST /payment-link/:linkId/paypal/capture', () => {
    it('should return 400 when PayPal not configured', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payment-link/link-123/paypal/capture',
        payload: { orderId: 'test-paypal-order' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: any;
  }
  interface FastifyRequest {
    userId?: string;
    farmId?: string;
    farmRole?: 'OWNER' | 'ADMIN' | 'FARM_MANAGER' | 'SALESPERSON' | 'FARM_OPERATOR';
  }
}
