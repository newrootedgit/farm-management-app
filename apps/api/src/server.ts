import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import tenantPlugin from './plugins/tenant.js';
import farmsRoutes from './modules/farms/farms.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import skusRoutes from './modules/skus/skus.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import storefrontRoutes from './modules/storefront/storefront.routes.js';
import employeesRoutes from './modules/employees/employees.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
await mkdir(join(uploadsDir, 'logos'), { recursive: true });

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

await fastify.register(multipart, {
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
});

await fastify.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
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
await fastify.register(paymentsRoutes, { prefix: '/api/v1' });
await fastify.register(skusRoutes, { prefix: '/api/v1' });
await fastify.register(customersRoutes, { prefix: '/api/v1' });
await fastify.register(storefrontRoutes, { prefix: '/api/v1' });
await fastify.register(employeesRoutes, { prefix: '/api/v1' });

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
