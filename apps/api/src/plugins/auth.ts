import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyToken } from '@clerk/backend';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userExternalId?: string;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('userId', undefined);
  fastify.decorateRequest('userExternalId', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    // Skip auth for health check and public routes
    if (request.url === '/health' || request.url.startsWith('/public')) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // For development, allow requests without auth
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        return;
      }
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      request.userExternalId = payload.sub;

      // Get user by externalId first
      let user = await fastify.prisma.user.findUnique({
        where: { externalId: payload.sub },
      });

      // If not found by externalId, try to link by email (for test accounts)
      if (!user && payload.email) {
        const existingUserByEmail = await fastify.prisma.user.findUnique({
          where: { email: payload.email as string },
        });

        if (existingUserByEmail) {
          // Update externalId to link Clerk account to existing user
          user = await fastify.prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: { externalId: payload.sub },
          });
          fastify.log.info(`Linked Clerk user ${payload.sub} to existing user ${user.email}`);
        } else {
          // Create new user
          user = await fastify.prisma.user.create({
            data: {
              externalId: payload.sub,
              email: payload.email as string,
              name: (payload.name as string) || (payload.email as string).split('@')[0],
            },
          });
          fastify.log.info(`Created new user for Clerk user ${payload.sub}: ${user.email}`);
        }
      }

      if (user) {
        request.userId = user.id;
      }
    } catch (error) {
      fastify.log.error('Auth error:', error);
      // Don't throw - let routes handle unauthenticated requests
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});
