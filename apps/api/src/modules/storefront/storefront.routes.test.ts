import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import storefrontRoutes from './storefront.routes.js';

// Test fixtures - Using CUID-like format for IDs
const testFarm = {
  id: 'cm5farmid00001test00000001',
  name: 'Test Farm',
  slug: 'test-farm',
  timezone: 'America/New_York',
  currency: 'USD',
  logoUrl: null,
};

const testProduct = {
  id: 'cm5prodid00001test00000001',
  farmId: 'cm5farmid00001test00000001',
  name: 'Test Microgreens',
  categoryId: null,
  category: null,
  daysSoaking: 1,
  daysGermination: 3,
  daysLight: 5,
  avgYieldPerTray: 8,
  skus: [
    {
      id: 'cm5skuid000001test00000001',
      skuCode: 'MG-001',
      name: '4oz Container',
      weightOz: 4,
      price: 599,
      isPublic: true,
      isAvailable: true,
      displayOrder: 1,
      imageUrl: null,
    },
  ],
};

const testCategory = {
  id: 'cm5catid000001test00000001',
  name: 'Microgreens',
};

const testCustomer = {
  id: 'cm5custid00001test00000001',
  farmId: 'cm5farmid00001test00000001',
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '555-1234',
  customerType: 'RETAIL',
  paymentTerms: 'DUE_ON_RECEIPT',
};

// Create mock Prisma
function createMockPrisma() {
  return {
    farm: {
      findFirst: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    productCategory: {
      findMany: vi.fn(),
    },
    sku: {
      findMany: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    order: {
      create: vi.fn(),
      count: vi.fn(),
    },
  };
}

// Build test app
async function buildTestApp(mockPrisma: ReturnType<typeof createMockPrisma>): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('prisma', mockPrisma);

  await app.register(storefrontRoutes);
  return app;
}

describe('Storefront Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
  });

  afterEach(async () => {
    await app.close();
  });

  // ========== GET STOREFRONT ==========
  describe('GET /storefront/:farmSlug', () => {
    it('should get storefront data', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);
      mockPrisma.productCategory.findMany.mockResolvedValue([testCategory]);
      mockPrisma.product.findMany.mockResolvedValue([testProduct]);

      const response = await app.inject({
        method: 'GET',
        url: '/storefront/test-farm',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.farm.name).toBe('Test Farm');
      expect(body.data.products).toHaveLength(1);
      expect(body.data.categories).toHaveLength(1);
    });

    it('should return 404 for non-existent farm', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/storefront/non-existent-farm',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  // ========== SUBMIT ORDER ==========
  describe('POST /storefront/:farmSlug/orders', () => {
    it('should submit a valid order', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);
      mockPrisma.sku.findMany.mockResolvedValue([
        {
          id: 'cm5skuid000001test00000001',
          productId: 'cm5prodid00001test00000001',
          price: 599,
          weightOz: 4,
          isPublic: true,
          isAvailable: true,
          product: {
            id: 'cm5prodid00001test00000001',
            farmId: 'cm5farmid00001test00000001',
            daysSoaking: 1,
            daysGermination: 3,
            daysLight: 5,
            avgYieldPerTray: 8,
          },
        },
      ]);
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue(testCustomer);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue({
        id: 'cm5orderid0001test00000001',
        orderNumber: 'ORD-00001',
        items: [],
      });

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const response = await app.inject({
        method: 'POST',
        url: '/storefront/test-farm/orders',
        payload: {
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '555-1234',
          deliveryDate: deliveryDate.toISOString().split('T')[0],
          items: [
            { skuId: 'cm5skuid000001test00000001', quantity: 2 },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.orderNumber).toBe('ORD-00001');
    });

    it('should return 404 for non-existent farm', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await app.inject({
        method: 'POST',
        url: '/storefront/non-existent/orders',
        payload: {
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          deliveryDate: futureDate.toISOString().split('T')[0],
          items: [{ skuId: 'cm5skuid000001test00000001', quantity: 1 }],
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid SKU', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);
      mockPrisma.sku.findMany.mockResolvedValue([]); // No matching SKUs

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await app.inject({
        method: 'POST',
        url: '/storefront/test-farm/orders',
        payload: {
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          deliveryDate: futureDate.toISOString().split('T')[0],
          items: [{ skuId: 'cm5invalidsku001test00001', quantity: 1 }],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('INVALID_SKU');
    });

    it('should use existing customer if email matches', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);
      mockPrisma.sku.findMany.mockResolvedValue([
        {
          id: 'cm5skuid000001test00000001',
          productId: 'cm5prodid00001test00000001',
          price: 599,
          weightOz: 4,
          isPublic: true,
          isAvailable: true,
          product: {
            id: 'cm5prodid00001test00000001',
            farmId: 'cm5farmid00001test00000001',
            daysSoaking: 1,
            daysGermination: 3,
            daysLight: 5,
            avgYieldPerTray: 8,
          },
        },
      ]);
      mockPrisma.customer.findFirst.mockResolvedValue(testCustomer);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.order.create.mockResolvedValue({
        id: 'cm5orderid0001test00000002',
        orderNumber: 'ORD-00006',
        items: [],
      });

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const response = await app.inject({
        method: 'POST',
        url: '/storefront/test-farm/orders',
        payload: {
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          deliveryDate: deliveryDate.toISOString().split('T')[0],
          items: [{ skuId: 'cm5skuid000001test00000001', quantity: 1 }],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });
  });

  // ========== CHECK AVAILABILITY ==========
  describe('GET /storefront/:farmSlug/availability', () => {
    it('should return availability for a date', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await app.inject({
        method: 'GET',
        url: `/storefront/test-farm/availability?date=${futureDate.toISOString().split('T')[0]}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.available).toBe(true);
    });

    it('should return 404 for non-existent farm', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/storefront/non-existent/availability',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should indicate unavailable for date with insufficient lead time', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await app.inject({
        method: 'GET',
        url: `/storefront/test-farm/availability?date=${tomorrow.toISOString().split('T')[0]}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.available).toBe(false);
    });

    it('should return minOrderDate without specific date', async () => {
      mockPrisma.farm.findFirst.mockResolvedValue(testFarm);

      const response = await app.inject({
        method: 'GET',
        url: '/storefront/test-farm/availability',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.minOrderDate).toBeDefined();
    });
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: any;
  }
}
