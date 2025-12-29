import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

type FarmRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER';

declare module 'fastify' {
  interface FastifyRequest {
    farmId?: string;
    farmRole?: FarmRole;
  }
}

// Role hierarchy for permission checks
const roleHierarchy: Record<FarmRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  EMPLOYEE: 2,
  VIEWER: 1,
};

export function requireRole(minRole: FarmRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.farmRole) {
      throw new ForbiddenError('No farm access');
    }

    if (roleHierarchy[request.farmRole] < roleHierarchy[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role or higher`);
    }
  };
}

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      throw new UnauthorizedError('Authentication required');
    }
  };
}

const tenantPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('farmId', undefined);
  fastify.decorateRequest('farmRole', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    // Extract farmId from route params
    const params = request.params as { farmId?: string };
    const farmId = params.farmId;

    if (!farmId || !request.userId) {
      return;
    }

    // Verify user has access to this farm
    const farmUser = await fastify.prisma.farmUser.findUnique({
      where: {
        userId_farmId: {
          userId: request.userId,
          farmId: farmId,
        },
      },
    });

    if (!farmUser) {
      // Check if user is a company admin
      const farm = await fastify.prisma.farm.findUnique({
        where: { id: farmId },
        include: {
          company: {
            include: {
              admins: {
                where: { id: request.userId },
              },
            },
          },
        },
      });

      if (farm?.company?.admins.length) {
        // Company admin has full access
        request.farmId = farmId;
        request.farmRole = 'OWNER';
        return;
      }

      // No access
      return;
    }

    request.farmId = farmId;
    request.farmRole = farmUser.role as FarmRole;
  });
};

export default fp(tenantPlugin, {
  name: 'tenant',
  dependencies: ['prisma', 'auth'],
});
