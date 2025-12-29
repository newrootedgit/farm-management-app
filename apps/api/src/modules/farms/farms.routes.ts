import { FastifyPluginAsync } from 'fastify';
import { CreateFarmSchema, UpdateFarmSchema } from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError } from '../../lib/errors.js';

// Demo user ID for development
const DEMO_USER_ID = 'demo-user-1';

const farmsRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper to get user ID (uses demo user in dev mode)
  const getUserId = (request: any): string => {
    if (request.userId) return request.userId;
    if (process.env.SKIP_AUTH === 'true') return DEMO_USER_ID;
    throw new Error('Unauthorized');
  };

  // List user's farms
  fastify.get('/farms', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const farms = await fastify.prisma.farm.findMany({
        where: {
          users: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          users: {
            where: { userId: userId },
            select: { role: true },
          },
          _count: {
            select: {
              zones: true,
              employees: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: farms.map((farm) => ({
          ...farm,
          role: farm.users[0]?.role,
          users: undefined,
        })),
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create a new farm
  fastify.post('/farms', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const data = CreateFarmSchema.parse(request.body);

      const farm = await fastify.prisma.farm.create({
        data: {
          name: data.name,
          slug: data.slug,
          timezone: data.timezone,
          currency: data.currency,
          users: {
            create: {
              userId: request.userId!,
              role: 'OWNER',
            },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: farm,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get a specific farm
  fastify.get('/farms/:farmId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied to this farm');
      }

      const farm = await fastify.prisma.farm.findUnique({
        where: { id: farmId },
        include: {
          _count: {
            select: {
              zones: true,
              employees: true,
              products: true,
              tasks: true,
            },
          },
        },
      });

      if (!farm) {
        throw new NotFoundError('Farm', farmId);
      }

      return {
        success: true,
        data: {
          ...farm,
          role: request.farmRole,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update a farm
  fastify.patch('/farms/:farmId', {
    preHandler: [requireAuth(), requireRole('MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = UpdateFarmSchema.parse(request.body);

      const farm = await fastify.prisma.farm.update({
        where: { id: farmId },
        data,
      });

      return {
        success: true,
        data: farm,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete a farm
  fastify.delete('/farms/:farmId', {
    preHandler: [requireAuth(), requireRole('OWNER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      await fastify.prisma.farm.delete({
        where: { id: farmId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get farm layout
  fastify.get('/farms/:farmId/layout', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      let layout = await fastify.prisma.farmLayout.findUnique({
        where: { farmId },
      });

      // Create default layout if none exists
      if (!layout) {
        layout = await fastify.prisma.farmLayout.create({
          data: {
            farmId,
            canvasData: {
              width: 1200,
              height: 800,
              backgroundColor: '#f0f0f0',
              gridSize: 20,
              zoom: 1,
              offsetX: 0,
              offsetY: 0,
            },
          },
        });
      }

      return {
        success: true,
        data: layout,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update farm layout
  fastify.put('/farms/:farmId/layout', {
    preHandler: [requireAuth(), requireRole('EMPLOYEE')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { canvasData } = request.body as { canvasData: unknown };

      const layout = await fastify.prisma.farmLayout.upsert({
        where: { farmId },
        update: { canvasData: canvasData as object },
        create: {
          farmId,
          canvasData: canvasData as object,
        },
      });

      return {
        success: true,
        data: layout,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // List zones
  fastify.get('/farms/:farmId/zones', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const zones = await fastify.prisma.zone.findMany({
        where: { farmId },
        include: {
          _count: {
            select: {
              machines: true,
              outputs: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: zones,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default farmsRoutes;
