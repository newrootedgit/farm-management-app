import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import customersRoutes from './customers.routes.js';

// Test fixtures - Using CUID-like format for IDs
const testCustomer = {
  id: 'cm5custid00001test00000001',
  farmId: 'cm5farmid00001test00000001',
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '555-5678',
  companyName: 'Test Company',
  customerType: 'RETAIL',
  paymentTerms: 'DUE_ON_RECEIPT',
  notes: 'VIP customer',
  isActive: true,
  tags: [],
  _count: { orders: 5 },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testTag = {
  id: 'cm5tagid000001test00000001',
  farmId: 'cm5farmid00001test00000001',
  name: 'VIP',
  color: '#FF5733',
  _count: { customers: 10 },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testOrder = {
  id: 'cm5orderid0001test00000001',
  farmId: 'cm5farmid00001test00000001',
  customerId: 'cm5custid00001test00000001',
  orderNumber: 'ORD-00001',
  status: 'PENDING',
  items: [],
  createdAt: new Date('2024-01-01'),
};

// Create mock Prisma
function createMockPrisma() {
  return {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customerTag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
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

  await app.register(customersRoutes);
  return app;
}

describe('Customers Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
  });

  afterEach(async () => {
    await app.close();
  });

  // ========== LIST CUSTOMERS ==========
  describe('GET /farms/:farmId/customers', () => {
    it('should list all customers', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([testCustomer]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Test Customer');
    });

    it('should filter by search query', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([testCustomer]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers?search=test',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by customer type', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([testCustomer]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers?customerType=RETAIL',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by active status', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([testCustomer]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers?isActive=true',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by tag', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([testCustomer]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers?tagId=cm5tagid000001test00000001',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== GET CUSTOMER ==========
  describe('GET /farms/:farmId/customers/:customerId', () => {
    it('should get a specific customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(testCustomer);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Customer');
    });

    it('should return 404 for non-existent customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== CREATE CUSTOMER ==========
  describe('POST /farms/:farmId/customers', () => {
    it('should create a customer', async () => {
      mockPrisma.customer.create.mockResolvedValue(testCustomer);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/cm5farmid00001test00000001/customers',
        payload: {
          name: 'Test Customer',
          email: 'customer@example.com',
          phone: '555-5678',
          customerType: 'RETAIL',
          paymentTerms: 'DUE_ON_RECEIPT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Customer');
    });

    it('should create customer with tags', async () => {
      mockPrisma.customer.create.mockResolvedValue({
        ...testCustomer,
        tags: [testTag],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/cm5farmid00001test00000001/customers',
        payload: {
          name: 'VIP Customer',
          tagIds: ['cm5tagid000001test00000001'],
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should create customer without email', async () => {
      mockPrisma.customer.create.mockResolvedValue({
        ...testCustomer,
        email: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/cm5farmid00001test00000001/customers',
        payload: {
          name: 'Walk-in Customer',
          customerType: 'RETAIL',
          paymentTerms: 'DUE_ON_RECEIPT',
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  // ========== UPDATE CUSTOMER ==========
  describe('PATCH /farms/:farmId/customers/:customerId', () => {
    it('should update a customer', async () => {
      mockPrisma.customer.update.mockResolvedValue({
        ...testCustomer,
        name: 'Updated Customer',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001',
        payload: { name: 'Updated Customer' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Customer');
    });

    it('should update customer email', async () => {
      mockPrisma.customer.update.mockResolvedValue({
        ...testCustomer,
        email: 'newemail@example.com',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001',
        payload: { email: 'newemail@example.com' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== DELETE CUSTOMER ==========
  describe('DELETE /farms/:farmId/customers/:customerId', () => {
    it('should soft delete a customer (set isActive to false)', async () => {
      mockPrisma.customer.update.mockResolvedValue({
        ...testCustomer,
        isActive: false,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== GET CUSTOMER ORDERS ==========
  describe('GET /farms/:farmId/customers/:customerId/orders', () => {
    it('should get customer orders', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(testCustomer);
      mockPrisma.order.findMany.mockResolvedValue([testOrder]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001/orders',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should return 404 for non-existent customer orders', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers/non-existent/orders',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should filter orders by status', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(testCustomer);
      mockPrisma.order.findMany.mockResolvedValue([testOrder]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001/orders?status=PENDING',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should limit orders', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(testCustomer);
      mockPrisma.order.findMany.mockResolvedValue([testOrder]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customers/cm5custid00001test00000001/orders?limit=5',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== CUSTOMER TAGS ==========
  describe('GET /farms/:farmId/customer-tags', () => {
    it('should list all tags', async () => {
      mockPrisma.customerTag.findMany.mockResolvedValue([testTag]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/cm5farmid00001test00000001/customer-tags',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('VIP');
    });
  });

  describe('POST /farms/:farmId/customer-tags', () => {
    it('should create a tag', async () => {
      mockPrisma.customerTag.create.mockResolvedValue(testTag);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/cm5farmid00001test00000001/customer-tags',
        payload: {
          name: 'VIP',
          color: '#FF5733',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('VIP');
    });
  });

  describe('PATCH /farms/:farmId/customer-tags/:tagId', () => {
    it('should update a tag', async () => {
      mockPrisma.customerTag.update.mockResolvedValue({
        ...testTag,
        name: 'Priority',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/cm5farmid00001test00000001/customer-tags/cm5tagid000001test00000001',
        payload: { name: 'Priority' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Priority');
    });
  });

  describe('DELETE /farms/:farmId/customer-tags/:tagId', () => {
    it('should delete a tag', async () => {
      mockPrisma.customerTag.delete.mockResolvedValue(testTag);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/cm5farmid00001test00000001/customer-tags/cm5tagid000001test00000001',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
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
