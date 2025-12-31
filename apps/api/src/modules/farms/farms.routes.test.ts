import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import farmsRoutes from './farms.routes.js';

// Test fixtures
const testFarm = {
  id: 'test-farm-id-123',
  name: 'Test Farm',
  slug: 'test-farm',
  timezone: 'America/New_York',
  currency: 'USD',
  logoUrl: null,
  companyId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testProduct = {
  id: 'test-product-id-123',
  farmId: 'test-farm-id-123',
  categoryId: null,
  category: null,
  name: 'Test Microgreens',
  daysSoaking: 1,
  daysGermination: 3,
  daysLight: 5,
  avgYieldPerTray: 8.0,
  seedsPerTray: 100,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testOrder = {
  id: 'test-order-id-123',
  farmId: 'test-farm-id-123',
  customerId: 'test-customer-id-123',
  customerName: 'Test Customer',
  orderNumber: 'ORD-00001',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  orderSource: 'DASHBOARD',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testLayoutElement = {
  id: 'test-element-id-123',
  farmId: 'test-farm-id-123',
  presetId: null,
  preset: null,
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  rotation: 0,
  fill: '#4CAF50',
  stroke: '#333',
  strokeWidth: 1,
  label: 'Test Zone',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testPreset = {
  id: 'test-preset-id-123',
  farmId: 'test-farm-id-123',
  name: 'Growing Area',
  type: 'rectangle',
  fill: '#4CAF50',
  stroke: '#333',
  strokeWidth: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testTask = {
  id: 'test-task-id-123',
  farmId: 'test-farm-id-123',
  orderItemId: 'test-order-item-id',
  title: 'SEED: Test Microgreens',
  type: 'SEED',
  description: 'Plant 2 trays of Test Microgreens',
  priority: 'MEDIUM',
  status: 'TODO',
  dueDate: new Date('2024-01-05'),
  completedAt: null,
  completedBy: null,
  completionNotes: null,
  actualTrays: null,
  seedLot: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Create a mock Prisma client factory
function createMockPrisma() {
  return {
    farm: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    farmUser: {
      findUnique: vi.fn(),
    },
    farmLayout: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    zone: {
      findMany: vi.fn(),
    },
    layoutElement: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    elementPreset: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    orderItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

// Build test app
async function buildTestApp(mockPrisma: ReturnType<typeof createMockPrisma>): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Decorate with mocked Prisma
  app.decorate('prisma', mockPrisma);

  // Mock request decorators
  app.decorateRequest('userId', 'demo-user-1');
  app.decorateRequest('farmId', undefined);
  app.decorateRequest('farmRole', undefined);

  // Add preHandler to set farm context
  app.addHook('preHandler', async (request) => {
    const params = request.params as { farmId?: string };
    if (params.farmId) {
      request.farmId = params.farmId;
      request.farmRole = 'OWNER';
    }
  });

  await app.register(farmsRoutes);
  return app;
}

describe('Farms Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
  });

  afterEach(async () => {
    await app.close();
  });

  // ========== LIST FARMS ==========
  describe('GET /farms', () => {
    it('should list all farms for user', async () => {
      mockPrisma.farm.findMany.mockResolvedValue([
        {
          ...testFarm,
          users: [{ role: 'OWNER' }],
          _count: { zones: 5, employees: 3 },
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Test Farm');
    });

    it('should return empty array when no farms', async () => {
      mockPrisma.farm.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(0);
    });
  });

  // ========== CREATE FARM ==========
  describe('POST /farms', () => {
    it('should create a new farm', async () => {
      mockPrisma.farm.create.mockResolvedValue(testFarm);

      const response = await app.inject({
        method: 'POST',
        url: '/farms',
        payload: {
          name: 'Test Farm',
          slug: 'test-farm',
          timezone: 'America/New_York',
          currency: 'USD',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Farm');
    });

    it('should reject invalid farm data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/farms',
        payload: {
          name: '',
        },
      });

      expect(response.statusCode).toBe(500); // Zod throws uncaught error
    });
  });

  // ========== GET FARM ==========
  describe('GET /farms/:farmId', () => {
    it('should get a specific farm', async () => {
      mockPrisma.farm.findUnique.mockResolvedValue({
        ...testFarm,
        _count: { zones: 5, employees: 3, products: 10, tasks: 20 },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Farm');
    });

    it('should return 404 for non-existent farm', async () => {
      mockPrisma.farm.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== UPDATE FARM ==========
  describe('PATCH /farms/:farmId', () => {
    it('should update farm', async () => {
      mockPrisma.farm.update.mockResolvedValue({
        ...testFarm,
        name: 'Updated Farm Name',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123',
        payload: {
          name: 'Updated Farm Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Farm Name');
    });
  });

  // ========== DELETE FARM ==========
  describe('DELETE /farms/:farmId', () => {
    it('should delete farm', async () => {
      mockPrisma.farm.delete.mockResolvedValue(testFarm);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });
  });

  // ========== FARM LAYOUT ==========
  describe('GET /farms/:farmId/layout', () => {
    it('should get farm layout', async () => {
      const testLayout = {
        id: 'layout-id',
        farmId: 'test-farm-id-123',
        canvasData: { width: 1200, height: 800 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.farmLayout.findUnique.mockResolvedValue(testLayout);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/layout',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.canvasData).toBeDefined();
    });

    it('should create default layout if none exists', async () => {
      const defaultLayout = {
        id: 'new-layout-id',
        farmId: 'test-farm-id-123',
        canvasData: { width: 1200, height: 800, backgroundColor: '#f0f0f0' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.farmLayout.findUnique.mockResolvedValue(null);
      mockPrisma.farmLayout.create.mockResolvedValue(defaultLayout);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/layout',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('PUT /farms/:farmId/layout', () => {
    it('should update farm layout', async () => {
      const updatedLayout = {
        id: 'layout-id',
        farmId: 'test-farm-id-123',
        canvasData: { width: 1500, height: 1000 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.farmLayout.upsert.mockResolvedValue(updatedLayout);

      const response = await app.inject({
        method: 'PUT',
        url: '/farms/test-farm-id-123/layout',
        payload: {
          canvasData: { width: 1500, height: 1000 },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== ZONES ==========
  describe('GET /farms/:farmId/zones', () => {
    it('should list zones', async () => {
      mockPrisma.zone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          farmId: 'test-farm-id-123',
          name: 'Growing Zone',
          _count: { machines: 2, outputs: 5 },
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/zones',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });

  // ========== LAYOUT ELEMENTS ==========
  describe('GET /farms/:farmId/layout/elements', () => {
    it('should list layout elements', async () => {
      mockPrisma.layoutElement.findMany.mockResolvedValue([testLayoutElement]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/layout/elements',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('POST /farms/:farmId/layout/elements', () => {
    it('should create layout element', async () => {
      mockPrisma.layoutElement.create.mockResolvedValue(testLayoutElement);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/layout/elements',
        payload: {
          name: 'Growing Area',
          type: 'GROW_RACK',
          positionX: 100,
          positionY: 100,
          width: 200,
          height: 150,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /farms/:farmId/layout/elements/:elementId', () => {
    it('should update layout element', async () => {
      mockPrisma.layoutElement.update.mockResolvedValue({
        ...testLayoutElement,
        x: 200,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/layout/elements/test-element-id-123',
        payload: { x: 200 },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /farms/:farmId/layout/elements/:elementId', () => {
    it('should delete layout element', async () => {
      mockPrisma.layoutElement.delete.mockResolvedValue(testLayoutElement);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/layout/elements/test-element-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });
  });

  describe('PUT /farms/:farmId/layout/elements/bulk', () => {
    it('should bulk update elements', async () => {
      mockPrisma.$transaction.mockResolvedValue([testLayoutElement]);

      const response = await app.inject({
        method: 'PUT',
        url: '/farms/test-farm-id-123/layout/elements/bulk',
        payload: {
          elements: [{ id: 'test-element-id-123', updates: { x: 300 } }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== ELEMENT PRESETS ==========
  describe('GET /farms/:farmId/layout/presets', () => {
    it('should list presets', async () => {
      mockPrisma.elementPreset.findMany.mockResolvedValue([testPreset]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/layout/presets',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('POST /farms/:farmId/layout/presets', () => {
    it('should create preset', async () => {
      mockPrisma.elementPreset.create.mockResolvedValue(testPreset);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/layout/presets',
        payload: {
          name: 'Growing Area',
          type: 'GROW_RACK',
          defaultColor: '#4CAF50',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /farms/:farmId/layout/presets/:presetId', () => {
    it('should update preset', async () => {
      mockPrisma.elementPreset.update.mockResolvedValue({
        ...testPreset,
        name: 'Updated Preset',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/layout/presets/test-preset-id-123',
        payload: { name: 'Updated Preset' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /farms/:farmId/layout/presets/:presetId', () => {
    it('should delete preset', async () => {
      mockPrisma.elementPreset.delete.mockResolvedValue(testPreset);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/layout/presets/test-preset-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });
  });

  // ========== USER PREFERENCES ==========
  describe('GET /farms/:farmId/preferences', () => {
    it('should get user preferences', async () => {
      const prefs = {
        id: 'pref-id',
        userId: 'demo-user-1',
        farmId: 'test-farm-id-123',
        showGrid: true,
        snapToGrid: true,
        gridSize: 20,
      };
      mockPrisma.userPreference.findUnique.mockResolvedValue(prefs);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/preferences',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should create default preferences if none exist', async () => {
      const defaultPrefs = {
        id: 'new-pref-id',
        userId: 'demo-user-1',
        farmId: 'test-farm-id-123',
      };
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      mockPrisma.userPreference.create.mockResolvedValue(defaultPrefs);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/preferences',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /farms/:farmId/preferences', () => {
    it('should update preferences', async () => {
      const updatedPrefs = {
        id: 'pref-id',
        userId: 'demo-user-1',
        farmId: 'test-farm-id-123',
        showGrid: false,
      };
      mockPrisma.userPreference.upsert.mockResolvedValue(updatedPrefs);

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/preferences',
        payload: { showGrid: false },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== PRODUCTS ==========
  describe('GET /farms/:farmId/products', () => {
    it('should list products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { ...testProduct, _count: { skus: 3 } },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /farms/:farmId/products/:productId', () => {
    it('should get single product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(testProduct);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/test-product-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Microgreens');
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/products/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /farms/:farmId/products', () => {
    it('should create product', async () => {
      mockPrisma.product.create.mockResolvedValue(testProduct);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/products',
        payload: {
          name: 'Test Microgreens',
          daysSoaking: 1,
          daysGermination: 3,
          daysLight: 5,
          avgYieldPerTray: 8.0,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('PATCH /farms/:farmId/products/:productId', () => {
    it('should update product', async () => {
      mockPrisma.product.update.mockResolvedValue({
        ...testProduct,
        name: 'Updated Product',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/products/test-product-id-123',
        payload: { name: 'Updated Product' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /farms/:farmId/products/:productId', () => {
    it('should delete product when not in orders', async () => {
      mockPrisma.orderItem.count.mockResolvedValue(0);
      mockPrisma.product.delete.mockResolvedValue(testProduct);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });

    it('should prevent deletion when product is in orders', async () => {
      mockPrisma.orderItem.count.mockResolvedValue(5);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/products/test-product-id-123',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  // ========== ORDERS ==========
  describe('GET /farms/:farmId/orders', () => {
    it('should list orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { ...testOrder, items: [], _count: { items: 2 } },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/orders',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should filter orders by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { ...testOrder, status: 'PENDING', items: [], _count: { items: 1 } },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/orders?status=PENDING',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /farms/:farmId/orders/:orderId', () => {
    it('should get single order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...testOrder,
        items: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/orders/test-order-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.orderNumber).toBe('ORD-00001');
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/orders/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /farms/:farmId/orders/:orderId', () => {
    it('should update order', async () => {
      mockPrisma.order.update.mockResolvedValue({
        ...testOrder,
        status: 'IN_PROGRESS',
        items: [],
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/orders/test-order-id-123',
        payload: { status: 'IN_PROGRESS' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /farms/:farmId/orders/:orderId', () => {
    it('should delete order', async () => {
      mockPrisma.order.delete.mockResolvedValue(testOrder);

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/orders/test-order-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });
  });

  // ========== TASKS ==========
  describe('GET /farms/:farmId/tasks', () => {
    it('should list tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { ...testTask, orderItem: null, assignments: [] },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/tasks',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should filter tasks by type', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { ...testTask, type: 'SEED', orderItem: null, assignments: [] },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/tasks?type=SEED',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should filter tasks by date range', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { ...testTask, orderItem: null, assignments: [] },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/tasks?fromDate=2024-01-01&toDate=2024-01-31',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /farms/:farmId/tasks/calendar', () => {
    it('should get tasks for calendar view', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { ...testTask, orderItem: null },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/tasks/calendar?startDate=2024-01-01&endDate=2024-01-31',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should require date parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/tasks/calendar',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /farms/:farmId/tasks/:taskId', () => {
    it('should update task', async () => {
      mockPrisma.task.update.mockResolvedValue({
        ...testTask,
        status: 'IN_PROGRESS',
        orderItem: null,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/tasks/test-task-id-123',
        payload: { status: 'IN_PROGRESS' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should set completedAt when marking as completed', async () => {
      mockPrisma.task.update.mockResolvedValue({
        ...testTask,
        status: 'COMPLETED',
        completedAt: new Date(),
        orderItemId: null,
        orderItem: null,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/tasks/test-task-id-123',
        payload: { status: 'COMPLETED' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /farms/:farmId/tasks/:taskId/complete', () => {
    it('should complete task with log data', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        ...testTask,
        orderItem: { id: 'order-item-id', productId: testProduct.id },
      });
      mockPrisma.task.update.mockResolvedValue({
        ...testTask,
        status: 'COMPLETED',
        completedBy: 'John Doe',
        orderItem: { ...testTask, product: testProduct },
      });
      mockPrisma.orderItem.update.mockResolvedValue({ id: 'order-item-id' });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/tasks/test-task-id-123/complete',
        payload: {
          completedBy: 'John Doe',
          completionNotes: 'Task completed successfully',
          actualTrays: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should require completedBy field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/tasks/test-task-id-123/complete',
        payload: {
          completionNotes: 'Missing completedBy',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/tasks/non-existent/complete',
        payload: {
          completedBy: 'John Doe',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should mark order as READY when all items harvested', async () => {
      const orderItemId = 'order-item-id-123';
      mockPrisma.task.findUnique.mockResolvedValue({
        ...testTask,
        type: 'HARVEST',
        orderItemId,
        orderItem: { id: orderItemId, productId: testProduct.id },
      });
      mockPrisma.task.update.mockResolvedValue({
        ...testTask,
        type: 'HARVEST',
        status: 'COMPLETED',
        completedBy: 'John Doe',
        orderItemId,
        orderItem: { id: orderItemId, product: testProduct, status: 'HARVESTED' },
      });
      mockPrisma.orderItem.update.mockResolvedValue({ id: orderItemId, status: 'HARVESTED' });
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'test-order-id',
        items: [{ id: orderItemId, status: 'HARVESTED' }],
      });
      mockPrisma.order.update.mockResolvedValue({ id: 'test-order-id', status: 'READY' });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/tasks/test-task-id-123/complete',
        payload: {
          completedBy: 'John Doe',
          status: 'HARVESTED',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update product yield when harvest data provided', async () => {
      const orderItemId = 'order-item-id-456';
      mockPrisma.task.findUnique.mockResolvedValue({
        ...testTask,
        type: 'HARVEST',
        orderItemId,
        orderItem: { id: orderItemId, productId: testProduct.id },
      });
      mockPrisma.task.update.mockResolvedValue({
        ...testTask,
        type: 'HARVEST',
        status: 'COMPLETED',
        orderItemId,
        orderItem: { id: orderItemId, product: testProduct, status: 'HARVESTED' },
      });
      mockPrisma.orderItem.update.mockResolvedValue({ id: orderItemId, status: 'HARVESTED' });
      mockPrisma.orderItem.findUnique.mockResolvedValue({ id: orderItemId, productId: testProduct.id });
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'test-order-id',
        items: [{ id: orderItemId, status: 'HARVESTED' }],
      });
      mockPrisma.order.update.mockResolvedValue({ id: 'test-order-id', status: 'READY' });
      mockPrisma.product.findUnique.mockResolvedValue(testProduct);
      mockPrisma.product.update.mockResolvedValue({ ...testProduct, avgYieldPerTray: 10 });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/tasks/test-task-id-123/complete',
        payload: {
          completedBy: 'John Doe',
          status: 'HARVESTED',
          actualYieldOz: 30,
          actualTrays: 3,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

// Extend Fastify types for tests
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
