import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import skusRoutes from './skus.routes.js';

// Test fixtures
const testProduct = {
  id: 'test-product-id-123',
  farmId: 'test-farm-id-123',
  name: 'Test Microgreens',
};

const testSku = {
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
  product: testProduct,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Create mock Prisma
function createMockPrisma() {
  return {
    product: {
      findUnique: vi.fn(),
    },
    sku: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orderItem: {
      count: vi.fn(),
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

  await app.register(skusRoutes);
  return app;
}

describe('SKUs Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
  });

  afterEach(async () => {
    await app.close();
  });

  // ========== LIST SKUS FOR PRODUCT ==========
  describe('GET /farms/:farmId/products/:productId/skus', () => {
    it('should list all SKUs for a product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(testProduct);
      mockPrisma.sku.findMany.mockResolvedValue([testSku]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].skuCode).toBe('MG-001');
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/non-existent/skus',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== GET SINGLE SKU ==========
  describe('GET /farms/:farmId/products/:productId/skus/:skuId', () => {
    it('should get a specific SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(testSku);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.skuCode).toBe('MG-001');
    });

    it('should return 404 for non-existent SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for wrong farm', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        product: { ...testProduct, farmId: 'different-farm-id' },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== CREATE SKU ==========
  describe('POST /farms/:farmId/products/:productId/skus', () => {
    it('should create a SKU', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(testProduct);
      mockPrisma.sku.create.mockResolvedValue(testSku);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus',
        payload: {
          skuCode: 'MG-001',
          name: '4oz Container',
          weightOz: 4,
          price: 599,
          isPublic: true,
          isAvailable: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.skuCode).toBe('MG-001');
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/products/non-existent/skus',
        payload: {
          skuCode: 'MG-001',
          name: '4oz Container',
          weightOz: 4,
          price: 599,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== UPDATE SKU ==========
  describe('PATCH /farms/:farmId/products/:productId/skus/:skuId', () => {
    it('should update a SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(testSku);
      mockPrisma.sku.update.mockResolvedValue({
        ...testSku,
        price: 699,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
        payload: { price: 699 },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.price).toBe(699);
    });

    it('should return 404 for non-existent SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/non-existent',
        payload: { price: 699 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== DELETE SKU ==========
  describe('DELETE /farms/:farmId/products/:productId/skus/:skuId', () => {
    it('should delete a SKU not in orders', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(testSku);
      mockPrisma.orderItem.count.mockResolvedValue(0);
      mockPrisma.sku.delete.mockResolvedValue(testSku);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });

    it('should prevent deletion when SKU is in orders', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(testSku);
      mockPrisma.orderItem.count.mockResolvedValue(5);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it('should return 404 for non-existent SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== LIST ALL SKUS FOR FARM ==========
  describe('GET /farms/:farmId/skus', () => {
    it('should list all SKUs for a farm', async () => {
      mockPrisma.sku.findMany.mockResolvedValue([testSku]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/skus',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should filter by isPublic', async () => {
      mockPrisma.sku.findMany.mockResolvedValue([testSku]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/skus?isPublic=true',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by isAvailable', async () => {
      mockPrisma.sku.findMany.mockResolvedValue([testSku]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/skus?isAvailable=true',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== SKU IMAGE UPLOAD ==========
  describe('POST /farms/:farmId/products/:productId/skus/:skuId/image', () => {
    it('should return 404 for non-existent SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/non-existent/image',
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for wrong farm', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        product: { ...testProduct, farmId: 'different-farm-id' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123/image',
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return error when no file uploaded', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(testSku);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123/image',
        payload: {},
      });

      // Route requires multipart file upload; without it, returns 500
      expect([400, 500]).toContain(response.statusCode);
    });
  });

  // ========== SKU IMAGE DELETE ==========
  describe('DELETE /farms/:farmId/products/:productId/skus/:skuId/image', () => {
    it('should return 404 for non-existent SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/non-existent/image',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for wrong product', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        productId: 'different-product-id',
        product: testProduct,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123/image',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should delete image when SKU has no image', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        imageUrl: null,
      });
      mockPrisma.sku.update.mockResolvedValue({
        ...testSku,
        imageUrl: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123/image',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });

    it('should delete image when SKU has existing image', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        imageUrl: '/uploads/skus/test-sku-id-123.jpg',
      });
      mockPrisma.sku.update.mockResolvedValue({
        ...testSku,
        imageUrl: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123/image',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== ADDITIONAL EDGE CASES ==========
  describe('Edge cases', () => {
    it('should return 404 for wrong product when updating SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        productId: 'different-product-id',
        product: testProduct,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
        payload: { price: 799 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for wrong product when deleting SKU', async () => {
      mockPrisma.sku.findUnique.mockResolvedValue({
        ...testSku,
        productId: 'different-product-id',
        product: testProduct,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123/skus/test-sku-id-123',
      });

      expect(response.statusCode).toBe(404);
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
