import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import employeesRoutes from './employees.routes.js';

// Test fixtures
const testEmployee = {
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
  status: 'ACTIVE',
  inviteToken: null,
  inviteStatus: null,
  inviteExpiresAt: null,
  invitedAt: null,
  acceptedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  farmUser: null,
  _count: { shifts: 5, timeEntries: 20 },
};

const testFarm = {
  id: 'test-farm-id-123',
  name: 'Test Farm',
  slug: 'test-farm',
};

// Create mock Prisma
function createMockPrisma() {
  return {
    employee: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
    farmUser: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    farm: {
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

  await app.register(employeesRoutes);
  return app;
}

describe('Employees Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
  });

  afterEach(async () => {
    await app.close();
  });

  // ========== LIST EMPLOYEES ==========
  describe('GET /farms/:farmId/employees', () => {
    it('should list all employees', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([testEmployee]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/employees',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].firstName).toBe('John');
    });

    it('should filter by search query', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([testEmployee]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/employees?search=john',
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.employee.findMany).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([testEmployee]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/employees?status=ACTIVE',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by position', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([testEmployee]);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/employees?position=FARM_MANAGER',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== GET EMPLOYEE ==========
  describe('GET /farms/:farmId/employees/:employeeId', () => {
    it('should get a specific employee', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(testEmployee);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/employees/test-employee-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('John');
    });

    it('should return 404 for non-existent employee', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/farms/test-farm-id-123/employees/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== CREATE EMPLOYEE ==========
  describe('POST /farms/:farmId/employees', () => {
    it('should create an employee', async () => {
      mockPrisma.employee.create.mockResolvedValue(testEmployee);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/employees',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          position: 'FARM_MANAGER',
          status: 'ACTIVE',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('John');
    });

    it('should create employee with phone but no email', async () => {
      mockPrisma.employee.create.mockResolvedValue({
        ...testEmployee,
        email: null,
        phone: '555-9999',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/employees',
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '555-9999',
          position: 'FARM_OPERATOR',
          status: 'ACTIVE',
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  // ========== UPDATE EMPLOYEE ==========
  describe('PATCH /farms/:farmId/employees/:employeeId', () => {
    it('should update an employee', async () => {
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        firstName: 'Jane',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/employees/test-employee-id-123',
        payload: { firstName: 'Jane' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('Jane');
    });

    it('should update employee status', async () => {
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        status: 'ON_LEAVE',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/farms/test-farm-id-123/employees/test-employee-id-123',
        payload: { status: 'ON_LEAVE' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ========== DELETE EMPLOYEE ==========
  describe('DELETE /farms/:farmId/employees/:employeeId', () => {
    it('should soft delete an employee (set status to TERMINATED)', async () => {
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        status: 'TERMINATED',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/farms/test-farm-id-123/employees/test-employee-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ========== EMPLOYEE INVITE ==========
  describe('POST /farms/:farmId/employees/:employeeId/invite', () => {
    it('should send invite to employee with email', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        farm: testFarm,
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        inviteToken: 'test-token-123',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/employees/test-employee-id-123/invite',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should fail if employee has no email', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        email: null,
        farm: testFarm,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/employees/test-employee-id-123/invite',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it('should return 404 for non-existent employee', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/farms/test-farm-id-123/employees/non-existent/invite',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ========== ACCEPT INVITE (PUBLIC) ==========
  describe('POST /invites/:token/accept', () => {
    it('should accept invite with valid token and password', async () => {
      const inviteEmployee = {
        ...testEmployee,
        inviteToken: 'valid-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: testFarm,
      };

      mockPrisma.employee.findUnique.mockResolvedValue(inviteEmployee);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'john@example.com',
        name: 'John Doe',
      });
      mockPrisma.farmUser.create.mockResolvedValue({
        id: 'new-farm-user-id',
        userId: 'new-user-id',
        farmId: 'test-farm-id-123',
        role: 'FARM_OPERATOR',
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        inviteStatus: 'ACCEPTED',
        farmUserId: 'new-farm-user-id',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/invites/valid-token/accept',
        payload: {
          password: 'secure123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('should clear inviteToken after successful acceptance', async () => {
      const inviteEmployee = {
        ...testEmployee,
        inviteToken: 'valid-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: testFarm,
      };

      mockPrisma.employee.findUnique.mockResolvedValue(inviteEmployee);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'john@example.com',
        name: 'John Doe',
      });
      mockPrisma.farmUser.create.mockResolvedValue({
        id: 'new-farm-user-id',
        userId: 'new-user-id',
        farmId: 'test-farm-id-123',
        role: 'FARM_MANAGER',
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        inviteStatus: 'ACCEPTED',
        inviteToken: null,
        farmUserId: 'new-farm-user-id',
      });

      await app.inject({
        method: 'POST',
        url: '/invites/valid-token/accept',
        payload: {
          password: 'secure123',
        },
      });

      // Verify update was called with inviteToken: null
      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inviteToken: null,
          }),
        })
      );
    });

    it('should map FARM_MANAGER position to FARM_MANAGER role', async () => {
      const managerEmployee = {
        ...testEmployee,
        position: 'FARM_MANAGER',
        inviteToken: 'manager-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: testFarm,
      };

      mockPrisma.employee.findUnique.mockResolvedValue(managerEmployee);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'john@example.com',
        name: 'John Doe',
      });
      mockPrisma.farmUser.create.mockResolvedValue({
        id: 'new-farm-user-id',
        userId: 'new-user-id',
        farmId: 'test-farm-id-123',
        role: 'FARM_MANAGER',
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...managerEmployee,
        inviteStatus: 'ACCEPTED',
      });

      await app.inject({
        method: 'POST',
        url: '/invites/manager-token/accept',
        payload: { password: 'secure123' },
      });

      expect(mockPrisma.farmUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'FARM_MANAGER',
          }),
        })
      );
    });

    it('should map SALESPERSON position to SALESPERSON role', async () => {
      const salesEmployee = {
        ...testEmployee,
        position: 'SALESPERSON',
        inviteToken: 'sales-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: testFarm,
      };

      mockPrisma.employee.findUnique.mockResolvedValue(salesEmployee);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'sales@example.com',
        name: 'Sales Person',
      });
      mockPrisma.farmUser.create.mockResolvedValue({
        id: 'new-farm-user-id',
        userId: 'new-user-id',
        farmId: 'test-farm-id-123',
        role: 'SALESPERSON',
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...salesEmployee,
        inviteStatus: 'ACCEPTED',
      });

      await app.inject({
        method: 'POST',
        url: '/invites/sales-token/accept',
        payload: { password: 'secure123' },
      });

      expect(mockPrisma.farmUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'SALESPERSON',
          }),
        })
      );
    });

    it('should map FARM_OPERATOR position to FARM_OPERATOR role', async () => {
      const operatorEmployee = {
        ...testEmployee,
        position: 'FARM_OPERATOR',
        inviteToken: 'operator-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: testFarm,
      };

      mockPrisma.employee.findUnique.mockResolvedValue(operatorEmployee);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'operator@example.com',
        name: 'Farm Operator',
      });
      mockPrisma.farmUser.create.mockResolvedValue({
        id: 'new-farm-user-id',
        userId: 'new-user-id',
        farmId: 'test-farm-id-123',
        role: 'FARM_OPERATOR',
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...operatorEmployee,
        inviteStatus: 'ACCEPTED',
      });

      await app.inject({
        method: 'POST',
        url: '/invites/operator-token/accept',
        payload: { password: 'secure123' },
      });

      expect(mockPrisma.farmUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'FARM_OPERATOR',
          }),
        })
      );
    });

    it('should reject short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/invites/valid-token/accept',
        payload: {
          password: '123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for invalid token', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/invites/invalid-token/accept',
        payload: {
          password: 'secure123',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject expired invite', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        inviteToken: 'expired-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        farm: testFarm,
      });
      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployee,
        inviteStatus: 'EXPIRED',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/invites/expired-token/accept',
        payload: {
          password: 'secure123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('EXPIRED');
    });

    it('should reject already accepted invite', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        inviteToken: 'used-token',
        inviteStatus: 'ACCEPTED',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: testFarm,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/invites/used-token/accept',
        payload: {
          password: 'secure123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('ALREADY_ACCEPTED');
    });
  });

  // ========== GET INVITE DETAILS (PUBLIC) ==========
  describe('GET /invites/:token', () => {
    it('should get invite details', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        inviteToken: 'valid-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: { id: testFarm.id, name: testFarm.name, logoUrl: null },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/invites/valid-token',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('John');
      expect(body.data.farm.name).toBe('Test Farm');
    });

    it('should return 404 for invalid token', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/invites/invalid-token',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should indicate expired invite', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        inviteToken: 'expired-token',
        inviteStatus: 'PENDING',
        inviteExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        farm: { id: testFarm.id, name: testFarm.name, logoUrl: null },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/invites/expired-token',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.isExpired).toBe(true);
    });

    it('should indicate already accepted invite', async () => {
      mockPrisma.employee.findUnique.mockResolvedValue({
        ...testEmployee,
        inviteToken: 'accepted-token',
        inviteStatus: 'ACCEPTED',
        inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        farm: { id: testFarm.id, name: testFarm.name, logoUrl: null },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/invites/accepted-token',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.isAccepted).toBe(true);
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
