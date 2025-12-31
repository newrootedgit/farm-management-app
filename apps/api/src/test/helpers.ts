import Fastify, { FastifyInstance } from 'fastify';
import { vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks between tests
export function resetPrismaMock() {
  mockReset(prismaMock);
}

// Type for mocked Prisma
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Test fixtures
export const testFixtures = {
  userId: 'demo-user-1',
  farmId: 'test-farm-id-123',
  employeeId: 'test-employee-id-123',
  customerId: 'test-customer-id-123',
  productId: 'test-product-id-123',
  skuId: 'test-sku-id-123',
  orderId: 'test-order-id-123',
  paymentId: 'test-payment-id-123',

  farm: {
    id: 'test-farm-id-123',
    name: 'Test Farm',
    slug: 'test-farm',
    timezone: 'America/New_York',
    currency: 'USD',
    logoUrl: null,
    companyId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  farmUser: {
    id: 'test-farm-user-id',
    userId: 'demo-user-1',
    farmId: 'test-farm-id-123',
    role: 'OWNER' as const,
    createdAt: new Date('2024-01-01'),
  },

  employee: {
    id: 'test-employee-id-123',
    farmId: 'test-farm-id-123',
    farmUserId: null,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    position: 'FARM_MANAGER',
    department: 'Operations',
    hireDate: new Date('2024-01-01'),
    hourlyRate: 25.00,
    status: 'ACTIVE' as const,
    inviteToken: null,
    inviteStatus: null,
    inviteExpiresAt: null,
    invitedAt: null,
    acceptedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  customer: {
    id: 'test-customer-id-123',
    farmId: 'test-farm-id-123',
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '555-5678',
    companyName: 'Test Company',
    customerType: 'RETAIL' as const,
    paymentTerms: 'DUE_ON_RECEIPT',
    notes: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  product: {
    id: 'test-product-id-123',
    farmId: 'test-farm-id-123',
    categoryId: null,
    name: 'Test Microgreens',
    daysSoaking: 1,
    daysGermination: 3,
    daysLight: 5,
    avgYieldPerTray: 8.0,
    seedsPerTray: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  sku: {
    id: 'test-sku-id-123',
    productId: 'test-product-id-123',
    skuCode: 'MG-001',
    name: '4oz Container',
    weightOz: 4,
    price: 599,
    isPublic: true,
    isAvailable: true,
    displayOrder: 1,
    imageUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  order: {
    id: 'test-order-id-123',
    farmId: 'test-farm-id-123',
    customerId: 'test-customer-id-123',
    customerName: 'Test Customer',
    orderNumber: 'ORD-00001',
    status: 'PENDING' as const,
    paymentStatus: 'PENDING' as const,
    orderSource: 'DASHBOARD' as const,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Build test Fastify app with mocked Prisma
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  // Decorate with mocked Prisma
  app.decorate('prisma', prismaMock);

  // Mock request decorators for auth
  app.decorateRequest('userId', 'demo-user-1');
  app.decorateRequest('farmId', undefined);
  app.decorateRequest('farmRole', undefined);

  // Setup mock for tenant verification
  prismaMock.farmUser.findUnique.mockResolvedValue(testFixtures.farmUser as any);

  // Add preHandler for tenant setup (simplified version)
  app.addHook('preHandler', async (request) => {
    const params = request.params as { farmId?: string };
    if (params.farmId) {
      request.farmId = params.farmId;
      request.farmRole = 'OWNER';
    }
  });

  return app;
}

// Extend FastifyRequest and FastifyInstance types for tests
declare module 'fastify' {
  interface FastifyInstance {
    prisma: DeepMockProxy<PrismaClient>;
  }
  interface FastifyRequest {
    userId?: string;
    farmId?: string;
    farmRole?: 'OWNER' | 'ADMIN' | 'FARM_MANAGER' | 'SALESPERSON' | 'FARM_OPERATOR';
  }
}

// Helper to create mock response for list queries with counts
export function createMockWithCount<T>(data: T, count: Record<string, number>) {
  return {
    ...data,
    _count: count,
  };
}
