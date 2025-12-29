import Fastify from 'fastify';
import cors from '@fastify/cors';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import tenantPlugin from './plugins/tenant.js';
import farmsRoutes from './modules/farms/farms.routes.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});

await fastify.register(prismaPlugin);
await fastify.register(authPlugin);
await fastify.register(tenantPlugin);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
await fastify.register(farmsRoutes, { prefix: '/api/v1' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`
🌾 Farm Management API is running!

   Local:   http://localhost:${port}
   Network: http://${host}:${port}

   Health:  http://localhost:${port}/health
   API:     http://localhost:${port}/api/v1
`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
