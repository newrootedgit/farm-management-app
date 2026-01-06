import { FastifyPluginAsync } from 'fastify';
import { pipeline } from 'stream/promises';
import { createWriteStream, unlink } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import {
  CreateFarmSchema,
  UpdateFarmSchema,
  CreateLayoutElementSchema,
  UpdateLayoutElementSchema,
  CreateElementPresetSchema,
  UpdateElementPresetSchema,
  UpdateUserPreferenceSchema,
  CreateProductSchema,
  UpdateProductSchema,
  CreateOrderSchema,
  UpdateOrderSchema,
  UpdateOrderItemSchema,
  UpdateTaskSchema,
  calculateProductionSchedule,
  calculateBlendProductionSchedule,
  generateOrderNumber,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

const unlinkAsync = promisify(unlink);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', '..', '..', 'uploads');

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
    preHandler: [requireAuth(), requireRole('ADMIN')],
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

  // Upload farm logo
  fastify.post('/farms/:farmId/logo', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      const data = await request.file();
      if (!data) {
        throw new BadRequestError('No file uploaded');
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!allowedTypes.includes(data.mimetype)) {
        throw new BadRequestError('Invalid file type. Allowed: PNG, JPG, SVG');
      }

      // Generate filename
      const ext = extname(data.filename) || '.png';
      const filename = `${farmId}${ext}`;
      const filepath = join(uploadsDir, 'logos', filename);

      // Save file
      await pipeline(data.file, createWriteStream(filepath));

      // Update farm with logo URL
      const logoUrl = `/uploads/logos/${filename}`;
      const farm = await fastify.prisma.farm.update({
        where: { id: farmId },
        data: { logoUrl },
      });

      return {
        success: true,
        data: { logoUrl: farm.logoUrl },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete farm logo
  fastify.delete('/farms/:farmId/logo', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      // Get current logo URL
      const farm = await fastify.prisma.farm.findUnique({
        where: { id: farmId },
        select: { logoUrl: true },
      });

      if (farm?.logoUrl) {
        // Delete the file
        const filename = farm.logoUrl.replace('/uploads/logos/', '');
        const filepath = join(uploadsDir, 'logos', filename);
        try {
          await unlinkAsync(filepath);
        } catch (err) {
          // File may not exist, ignore
        }
      }

      // Clear logo URL in database
      await fastify.prisma.farm.update({
        where: { id: farmId },
        data: { logoUrl: null },
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
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
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

  // ============================================================================
  // LAYOUT ELEMENTS
  // ============================================================================

  // List layout elements
  fastify.get('/farms/:farmId/layout/elements', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const elements = await fastify.prisma.layoutElement.findMany({
        where: { farmId },
        include: { preset: true },
        orderBy: { createdAt: 'asc' },
      });

      return {
        success: true,
        data: elements,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create layout element
  fastify.post('/farms/:farmId/layout/elements', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateLayoutElementSchema.parse(request.body);

      const element = await fastify.prisma.layoutElement.create({
        data: { ...data, farmId },
        include: { preset: true },
      });

      return reply.status(201).send({
        success: true,
        data: element,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update layout element
  fastify.patch('/farms/:farmId/layout/elements/:elementId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, elementId } = request.params as { farmId: string; elementId: string };
      const data = UpdateLayoutElementSchema.parse(request.body);

      const element = await fastify.prisma.layoutElement.update({
        where: { id: elementId, farmId },
        data,
        include: { preset: true },
      });

      return {
        success: true,
        data: element,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete layout element
  fastify.delete('/farms/:farmId/layout/elements/:elementId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, elementId } = request.params as { farmId: string; elementId: string };

      await fastify.prisma.layoutElement.delete({
        where: { id: elementId, farmId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Bulk update layout elements
  fastify.put('/farms/:farmId/layout/elements/bulk', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { elements } = request.body as { elements: Array<{ id: string; updates: Record<string, unknown> }> };

      const results = await fastify.prisma.$transaction(
        elements.map(({ id, updates }) =>
          fastify.prisma.layoutElement.update({
            where: { id, farmId },
            data: updates,
          })
        )
      );

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // ELEMENT PRESETS
  // ============================================================================

  // List presets
  fastify.get('/farms/:farmId/layout/presets', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const presets = await fastify.prisma.elementPreset.findMany({
        where: { farmId },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: presets,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create preset
  fastify.post('/farms/:farmId/layout/presets', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateElementPresetSchema.parse(request.body);

      const preset = await fastify.prisma.elementPreset.create({
        data: { ...data, farmId },
      });

      return reply.status(201).send({
        success: true,
        data: preset,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update preset
  fastify.patch('/farms/:farmId/layout/presets/:presetId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, presetId } = request.params as { farmId: string; presetId: string };
      const data = UpdateElementPresetSchema.parse(request.body);

      const preset = await fastify.prisma.elementPreset.update({
        where: { id: presetId, farmId },
        data,
      });

      return {
        success: true,
        data: preset,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete preset
  fastify.delete('/farms/:farmId/layout/presets/:presetId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, presetId } = request.params as { farmId: string; presetId: string };

      await fastify.prisma.elementPreset.delete({
        where: { id: presetId, farmId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // RACK ASSIGNMENTS (Production Tracking)
  // ============================================================================

  // List all active rack assignments with product/order details
  fastify.get('/farms/:farmId/rack-assignments', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const assignments = await fastify.prisma.rackAssignment.findMany({
        where: { farmId, isActive: true },
        include: {
          rackElement: {
            select: {
              id: true,
              name: true,
              metadata: true,
            },
          },
          orderItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  customerName: true,
                },
              },
            },
          },
        },
        orderBy: [
          { rackElementId: 'asc' },
          { level: 'asc' },
        ],
      });

      return {
        success: true,
        data: assignments,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get assignments for a specific rack element
  fastify.get('/farms/:farmId/rack-assignments/by-rack/:rackId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, rackId } = request.params as { farmId: string; rackId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const assignments = await fastify.prisma.rackAssignment.findMany({
        where: {
          farmId,
          rackElementId: rackId,
          isActive: true,
        },
        include: {
          orderItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  customerName: true,
                },
              },
            },
          },
        },
        orderBy: { level: 'asc' },
      });

      return {
        success: true,
        data: assignments,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create rack assignment (typically when completing MOVE_TO_LIGHT task)
  fastify.post('/farms/:farmId/rack-assignments', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const body = request.body as {
        rackElementId: string;
        level: number;
        orderItemId: string;
        trayCount: number;
        taskId?: string;
        assignedBy?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Validate the rack element exists and is a GROW_RACK
      const rackElement = await fastify.prisma.layoutElement.findFirst({
        where: {
          id: body.rackElementId,
          farmId,
          type: 'GROW_RACK',
        },
      });

      if (!rackElement) {
        throw new NotFoundError('Grow rack not found');
      }

      // Validate the order item exists
      const orderItem = await fastify.prisma.orderItem.findFirst({
        where: {
          id: body.orderItemId,
          order: { farmId },
        },
      });

      if (!orderItem) {
        throw new NotFoundError('Order item not found');
      }

      // Check if level is valid based on rack metadata
      const rackMetadata = rackElement.metadata as { levels?: number } | null;
      const maxLevels = rackMetadata?.levels ?? 1;
      if (body.level < 1 || body.level > maxLevels) {
        throw new BadRequestError(`Level must be between 1 and ${maxLevels}`);
      }

      const assignment = await fastify.prisma.rackAssignment.create({
        data: {
          farmId,
          rackElementId: body.rackElementId,
          level: body.level,
          orderItemId: body.orderItemId,
          trayCount: body.trayCount,
          taskId: body.taskId,
          assignedBy: body.assignedBy,
        },
        include: {
          rackElement: {
            select: {
              id: true,
              name: true,
              metadata: true,
            },
          },
          orderItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: assignment,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Remove rack assignment (soft delete - marks as inactive)
  fastify.delete('/farms/:farmId/rack-assignments/:assignmentId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, assignmentId } = request.params as { farmId: string; assignmentId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const assignment = await fastify.prisma.rackAssignment.update({
        where: {
          id: assignmentId,
          farmId,
        },
        data: {
          isActive: false,
          removedAt: new Date(),
        },
      });

      return {
        success: true,
        data: assignment,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  // Get user preferences
  fastify.get('/farms/:farmId/preferences', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const userId = getUserId(request);

      let prefs = await fastify.prisma.userPreference.findUnique({
        where: { userId_farmId: { userId, farmId } },
      });

      // Create default preferences if none exist
      if (!prefs) {
        prefs = await fastify.prisma.userPreference.create({
          data: { userId, farmId },
        });
      }

      return {
        success: true,
        data: prefs,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update user preferences
  fastify.patch('/farms/:farmId/preferences', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const userId = getUserId(request);
      const data = UpdateUserPreferenceSchema.parse(request.body);

      const prefs = await fastify.prisma.userPreference.upsert({
        where: { userId_farmId: { userId, farmId } },
        update: data,
        create: { userId, farmId, ...data },
      });

      return {
        success: true,
        data: prefs,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // PRODUCTS (Microgreen Varieties)
  // ============================================================================

  // List products/varieties
  fastify.get('/farms/:farmId/products', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const products = await fastify.prisma.product.findMany({
        where: { farmId },
        include: { category: true, _count: { select: { skus: true } } },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: products,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single product
  fastify.get('/farms/:farmId/products/:productId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, productId } = request.params as { farmId: string; productId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const product = await fastify.prisma.product.findUnique({
        where: { id: productId, farmId },
        include: { category: true },
      });

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create product/variety
  fastify.post('/farms/:farmId/products', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateProductSchema.parse(request.body);

      const product = await fastify.prisma.product.create({
        data: { ...data, farmId },
        include: { category: true },
      });

      return reply.status(201).send({
        success: true,
        data: product,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update product
  fastify.patch('/farms/:farmId/products/:productId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, productId } = request.params as { farmId: string; productId: string };
      const data = UpdateProductSchema.parse(request.body);

      const product = await fastify.prisma.product.update({
        where: { id: productId, farmId },
        data,
        include: { category: true },
      });

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete product
  fastify.delete('/farms/:farmId/products/:productId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, productId } = request.params as { farmId: string; productId: string };

      // Check if product is used in any orders
      const orderItemCount = await fastify.prisma.orderItem.count({
        where: { productId },
      });

      if (orderItemCount > 0) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete product that is used in orders',
        });
      }

      await fastify.prisma.product.delete({
        where: { id: productId, farmId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // ORDERS
  // ============================================================================

  // List orders
  fastify.get('/farms/:farmId/orders', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { status, customer } = request.query as {
        status?: string;
        customer?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const orders = await fastify.prisma.order.findMany({
        where: {
          farmId,
          ...(status && { status: status as any }),
          ...(customer && { customerName: { contains: customer } }),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single order
  fastify.get('/farms/:farmId/orders/:orderId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findUnique({
        where: { id: orderId, farmId },
        include: {
          items: {
            include: {
              product: true,
              tasks: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create order with items (auto-generates tasks)
  fastify.post('/farms/:farmId/orders', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateOrderSchema.parse(request.body);

      // Generate order number if not provided
      let orderNumber = data.orderNumber;
      if (!orderNumber) {
        const count = await fastify.prisma.order.count({ where: { farmId } });
        orderNumber = generateOrderNumber(count + 1);
      }

      // Create order with items in a transaction
      const order = await fastify.prisma.$transaction(async (tx) => {
        // Find or create customer if customer name is provided
        let customerId: string | null = null;
        if (data.customer) {
          // Try to find existing customer by name
          let customer = await tx.customer.findFirst({
            where: {
              farmId,
              name: data.customer,
            },
          });

          // Create new customer if not found
          if (!customer) {
            customer = await tx.customer.create({
              data: {
                farmId,
                name: data.customer,
                customerType: 'RETAIL',
                paymentTerms: 'DUE_ON_RECEIPT',
              },
            });
          }
          customerId = customer.id;
        }

        // Create order
        const newOrder = await tx.order.create({
          data: {
            farmId,
            orderNumber,
            customerName: data.customer,
            customerId,
            notes: data.notes,
          },
        });

        // Create items with calculated dates and auto-generate tasks
        for (const itemData of data.items) {
          const product = await tx.product.findUnique({
            where: { id: itemData.productId },
            include: {
              blend: {
                include: {
                  ingredients: {
                    include: { product: true },
                    orderBy: { displayOrder: 'asc' },
                  },
                },
              },
            },
          });

          if (!product) {
            throw new NotFoundError('Product', itemData.productId);
          }

          const harvestDate = new Date(itemData.harvestDate);
          const overagePercent = itemData.overagePercent ?? 10;

          // Check if this is a blend product
          if (product.isBlend && product.blend) {
            // ============================================
            // BLEND PRODUCT - Staggered ingredient tasks
            // ============================================
            const blend = product.blend;

            // Calculate staggered production schedule for all ingredients
            const blendSchedule = calculateBlendProductionSchedule({
              quantityOz: itemData.quantityOz,
              overagePercent,
              harvestDate,
              ingredients: blend.ingredients.map((ing) => ({
                productId: ing.productId,
                productName: ing.product.name,
                ratioPercent: ing.ratioPercent,
                avgYieldPerTray: ing.product.avgYieldPerTray || 8,
                daysSoaking: ing.overrideDaysSoaking ?? ing.product.daysSoaking,
                daysGermination: ing.overrideDaysGermination ?? ing.product.daysGermination ?? 0,
                daysLight: ing.overrideDaysLight ?? ing.product.daysLight ?? 0,
              })),
            });

            // Calculate total trays needed (sum of all ingredient trays)
            const totalTrays = blendSchedule.ingredients.reduce(
              (sum, ing) => sum + ing.traysNeeded,
              0
            );

            // Create order item for the blend
            const orderItem = await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: itemData.productId,
                quantityOz: itemData.quantityOz,
                harvestDate,
                overagePercent,
                traysNeeded: totalTrays,
                soakDate: blendSchedule.earliestStartDate,
                seedDate: blendSchedule.earliestStartDate,
                moveToLightDate: blendSchedule.earliestStartDate, // Not accurate for blends, but stored for consistency
              },
            });

            // Create BlendOrderInstance for tracking
            await tx.blendOrderInstance.create({
              data: {
                blendId: blend.id,
                orderItemId: orderItem.id,
                ingredientTargets: blendSchedule.ingredients.map((ing) => ({
                  productId: ing.productId,
                  productName: ing.productName,
                  targetOz: ing.targetOz,
                  traysNeeded: ing.traysNeeded,
                })),
              },
            });

            // Generate tasks for EACH ingredient (staggered dates)
            for (const ingSchedule of blendSchedule.ingredients) {
              // SOAK task (if this ingredient requires soaking)
              if (ingSchedule.requiresSoaking) {
                await tx.task.create({
                  data: {
                    farmId,
                    orderItemId: orderItem.id,
                    title: `SOAK: ${ingSchedule.productName} (for ${product.name})`,
                    type: 'SOAK',
                    dueDate: ingSchedule.soakDate,
                    description: `Soak ${ingSchedule.traysNeeded} trays of ${ingSchedule.productName} seeds for ${product.name} blend`,
                    priority: 'MEDIUM',
                    status: 'TODO',
                  },
                });
              }

              // SEED task
              await tx.task.create({
                data: {
                  farmId,
                  orderItemId: orderItem.id,
                  title: `SEED: ${ingSchedule.productName} (for ${product.name})`,
                  type: 'SEED',
                  dueDate: ingSchedule.seedDate,
                  description: `Plant ${ingSchedule.traysNeeded} trays of ${ingSchedule.productName} for ${product.name} blend`,
                  priority: 'MEDIUM',
                  status: 'TODO',
                },
              });

              // MOVE TO LIGHT task
              await tx.task.create({
                data: {
                  farmId,
                  orderItemId: orderItem.id,
                  title: `MOVE TO LIGHT: ${ingSchedule.productName} (for ${product.name})`,
                  type: 'MOVE_TO_LIGHT',
                  dueDate: ingSchedule.moveToLightDate,
                  description: `Move ${ingSchedule.traysNeeded} trays of ${ingSchedule.productName} to grow lights for ${product.name} blend`,
                  priority: 'MEDIUM',
                  status: 'TODO',
                },
              });
            }

            // Single HARVEST task for the entire blend
            await tx.task.create({
              data: {
                farmId,
                orderItemId: orderItem.id,
                title: `HARVEST: ${product.name} (Blend)`,
                type: 'HARVESTING',
                dueDate: harvestDate,
                description: `Harvest and mix ${itemData.quantityOz}oz of ${product.name} blend (${totalTrays} total trays)`,
                priority: 'MEDIUM',
                status: 'TODO',
              },
            });
          } else {
            // ============================================
            // REGULAR PRODUCT - Standard task generation
            // ============================================

            // Validate product has required microgreen fields (daysSoaking is optional)
            if (
              product.avgYieldPerTray == null ||
              product.daysGermination == null ||
              product.daysLight == null
            ) {
              throw new Error(
                `Product "${product.name}" is missing required production data (yield, germination days, light days)`
              );
            }

            // Calculate production schedule
            const schedule = calculateProductionSchedule({
              quantityOz: itemData.quantityOz,
              avgYieldPerTray: product.avgYieldPerTray,
              overagePercent,
              harvestDate,
              daysSoaking: product.daysSoaking,
              daysGermination: product.daysGermination,
              daysLight: product.daysLight,
            });

            // Create order item
            const orderItem = await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: itemData.productId,
                quantityOz: itemData.quantityOz,
                harvestDate,
                overagePercent,
                traysNeeded: schedule.traysNeeded,
                soakDate: schedule.soakDate,
                seedDate: schedule.seedDate,
                moveToLightDate: schedule.moveToLightDate,
              },
            });

            // Auto-generate tasks for this order item
            const tasks: Array<{
              title: string;
              type: 'SOAK' | 'SEED' | 'MOVE_TO_LIGHT' | 'HARVESTING';
              dueDate: Date;
              description: string;
            }> = [];

            // Only add SOAK task if this variety requires soaking
            if (schedule.requiresSoaking) {
              tasks.push({
                title: `SOAK: ${product.name}`,
                type: 'SOAK',
                dueDate: schedule.soakDate,
                description: `Soak ${schedule.traysNeeded} trays of ${product.name} seeds`,
              });
            }

            tasks.push(
              {
                title: `SEED: ${product.name}`,
                type: 'SEED',
                dueDate: schedule.seedDate,
                description: `Plant ${schedule.traysNeeded} trays of ${product.name}`,
              },
              {
                title: `MOVE TO LIGHT: ${product.name}`,
                type: 'MOVE_TO_LIGHT',
                dueDate: schedule.moveToLightDate,
                description: `Move ${schedule.traysNeeded} trays of ${product.name} to grow lights`,
              },
              {
                title: `HARVEST: ${product.name}`,
                type: 'HARVESTING',
                dueDate: schedule.harvestDate,
                description: `Harvest ${itemData.quantityOz}oz of ${product.name} (${schedule.traysNeeded} trays)`,
              }
            );

            for (const taskData of tasks) {
              await tx.task.create({
                data: {
                  farmId,
                  orderItemId: orderItem.id,
                  title: taskData.title,
                  type: taskData.type,
                  dueDate: taskData.dueDate,
                  description: taskData.description,
                  priority: 'MEDIUM',
                  status: 'TODO',
                },
              });
            }
          }
        }

        // Return complete order
        return tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            items: {
              include: { product: true, tasks: true },
            },
          },
        });
      });

      return reply.status(201).send({
        success: true,
        data: order,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update order
  fastify.patch('/farms/:farmId/orders/:orderId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const { customer, ...restData } = UpdateOrderSchema.parse(request.body);

      const order = await fastify.prisma.order.update({
        where: { id: orderId, farmId },
        data: {
          ...restData,
          ...(customer !== undefined && { customerName: customer }),
        },
        include: { items: { include: { product: true } } },
      });

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete order (cascades to items and tasks)
  fastify.delete('/farms/:farmId/orders/:orderId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      await fastify.prisma.order.delete({
        where: { id: orderId, farmId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Clone order (create a copy with new dates)
  fastify.post('/farms/:farmId/orders/:orderId/clone', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const { harvestDateOffset } = request.body as { harvestDateOffset?: number };

      // Get original order with items and product data
      const originalOrder = await fastify.prisma.order.findUnique({
        where: { id: orderId, farmId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!originalOrder) {
        throw new NotFoundError('Order', orderId);
      }

      // Default offset is 7 days if not provided
      const offsetDays = harvestDateOffset ?? 7;

      // Generate new order number
      const count = await fastify.prisma.order.count({ where: { farmId } });
      const newOrderNumber = generateOrderNumber(count + 1);

      // Create cloned order in a transaction
      const clonedOrder = await fastify.prisma.$transaction(async (tx) => {
        // Create the new order
        const newOrder = await tx.order.create({
          data: {
            farmId,
            orderNumber: newOrderNumber,
            customerName: originalOrder.customerName,
            customerId: originalOrder.customerId,
            notes: originalOrder.notes ? `Cloned from ${originalOrder.orderNumber}. ${originalOrder.notes}` : `Cloned from ${originalOrder.orderNumber}`,
          },
        });

        // Clone each item with new dates
        for (const item of originalOrder.items) {
          const product = item.product;

          // Calculate new harvest date
          const newHarvestDate = new Date(item.harvestDate);
          newHarvestDate.setDate(newHarvestDate.getDate() + offsetDays);

          // Recalculate production schedule
          const schedule = calculateProductionSchedule({
            quantityOz: item.quantityOz,
            avgYieldPerTray: product.avgYieldPerTray || 8,
            overagePercent: item.overagePercent,
            harvestDate: newHarvestDate,
            daysSoaking: product.daysSoaking,
            daysGermination: product.daysGermination || 0,
            daysLight: product.daysLight || 0,
          });

          // Create cloned order item
          const newItem = await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantityOz: item.quantityOz,
              harvestDate: newHarvestDate,
              overagePercent: item.overagePercent,
              traysNeeded: schedule.traysNeeded,
              soakDate: schedule.soakDate,
              seedDate: schedule.seedDate,
              moveToLightDate: schedule.moveToLightDate,
            },
          });

          // Auto-generate tasks for the cloned item
          const tasks: Array<{
            title: string;
            type: 'SOAK' | 'SEED' | 'MOVE_TO_LIGHT' | 'HARVESTING';
            dueDate: Date;
            description: string;
          }> = [];

          // Only add SOAK task if this variety requires soaking
          if (schedule.requiresSoaking) {
            tasks.push({
              title: `SOAK: ${product.name}`,
              type: 'SOAK',
              dueDate: schedule.soakDate,
              description: `Soak ${schedule.traysNeeded} trays of ${product.name} seeds`,
            });
          }

          tasks.push(
            {
              title: `SEED: ${product.name}`,
              type: 'SEED',
              dueDate: schedule.seedDate,
              description: `Plant ${schedule.traysNeeded} trays of ${product.name}`,
            },
            {
              title: `MOVE TO LIGHT: ${product.name}`,
              type: 'MOVE_TO_LIGHT',
              dueDate: schedule.moveToLightDate,
              description: `Move ${schedule.traysNeeded} trays of ${product.name} to grow lights`,
            },
            {
              title: `HARVEST: ${product.name}`,
              type: 'HARVESTING',
              dueDate: schedule.harvestDate,
              description: `Harvest ${item.quantityOz}oz of ${product.name} (${schedule.traysNeeded} trays)`,
            }
          );

          for (const taskData of tasks) {
            await tx.task.create({
              data: {
                farmId,
                orderItemId: newItem.id,
                title: taskData.title,
                type: taskData.type,
                dueDate: taskData.dueDate,
                description: taskData.description,
                priority: 'MEDIUM',
                status: 'TODO',
              },
            });
          }
        }

        // Return complete cloned order
        return tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            items: {
              include: { product: true, tasks: true },
            },
          },
        });
      });

      return reply.status(201).send({
        success: true,
        data: clonedOrder,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update order item
  fastify.patch('/farms/:farmId/orders/:orderId/items/:itemId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, itemId } = request.params as {
        farmId: string;
        orderId: string;
        itemId: string;
      };
      const data = UpdateOrderItemSchema.parse(request.body);

      // Get current item and product for recalculation if needed
      const currentItem = await fastify.prisma.orderItem.findUnique({
        where: { id: itemId },
        include: { product: true },
      });

      if (!currentItem) {
        throw new NotFoundError('OrderItem', itemId);
      }

      // If quantity or harvest date changed, recalculate
      let calculatedFields = {};
      if (data.quantityOz || data.harvestDate || data.overagePercent !== undefined) {
        const product = currentItem.product;
        if (
          product.avgYieldPerTray &&
          product.daysSoaking != null &&
          product.daysGermination != null &&
          product.daysLight != null
        ) {
          const schedule = calculateProductionSchedule({
            quantityOz: data.quantityOz ?? currentItem.quantityOz,
            avgYieldPerTray: product.avgYieldPerTray,
            overagePercent: data.overagePercent ?? currentItem.overagePercent,
            harvestDate: data.harvestDate ? new Date(data.harvestDate) : currentItem.harvestDate,
            daysSoaking: product.daysSoaking,
            daysGermination: product.daysGermination,
            daysLight: product.daysLight,
          });

          calculatedFields = {
            traysNeeded: schedule.traysNeeded,
            soakDate: schedule.soakDate,
            seedDate: schedule.seedDate,
            moveToLightDate: schedule.moveToLightDate,
          };

          // Update associated task due dates
          await fastify.prisma.$transaction([
            fastify.prisma.task.updateMany({
              where: { orderItemId: itemId, type: 'SOAK' },
              data: { dueDate: schedule.soakDate },
            }),
            fastify.prisma.task.updateMany({
              where: { orderItemId: itemId, type: 'SEED' },
              data: { dueDate: schedule.seedDate },
            }),
            fastify.prisma.task.updateMany({
              where: { orderItemId: itemId, type: 'MOVE_TO_LIGHT' },
              data: { dueDate: schedule.moveToLightDate },
            }),
            fastify.prisma.task.updateMany({
              where: { orderItemId: itemId, type: 'HARVESTING' },
              data: { dueDate: schedule.harvestDate },
            }),
          ]);
        }
      }

      const item = await fastify.prisma.orderItem.update({
        where: { id: itemId },
        data: { ...data, ...calculatedFields },
        include: { product: true, tasks: true },
      });

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // TASKS
  // ============================================================================

  // List tasks with filters
  fastify.get('/farms/:farmId/tasks', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { status, type, fromDate, toDate, orderItemId } = request.query as {
        status?: string;
        type?: string;
        fromDate?: string;
        toDate?: string;
        orderItemId?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const tasks = await fastify.prisma.task.findMany({
        where: {
          farmId,
          ...(status && { status: status as any }),
          ...(type && { type: type as any }),
          ...(orderItemId && { orderItemId }),
          ...(fromDate &&
            toDate && {
              dueDate: {
                gte: new Date(fromDate),
                lte: new Date(toDate),
              },
            }),
        },
        include: {
          orderItem: {
            include: {
              product: true,
              order: true,
            },
          },
          assignments: {
            include: { employee: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      return {
        success: true,
        data: tasks,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get tasks for calendar view
  fastify.get('/farms/:farmId/tasks/calendar', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { startDate, endDate } = request.query as { startDate: string; endDate: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      if (!startDate || !endDate) {
        return reply.status(400).send({
          success: false,
          error: 'startDate and endDate are required',
        });
      }

      const tasks = await fastify.prisma.task.findMany({
        where: {
          farmId,
          dueDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          orderItem: {
            include: { product: true, order: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      return {
        success: true,
        data: tasks,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update task (status, assignment, etc.)
  fastify.patch('/farms/:farmId/tasks/:taskId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, taskId } = request.params as { farmId: string; taskId: string };
      const data = UpdateTaskSchema.parse(request.body);

      const updateData: any = { ...data };

      // Set completedAt when status changes to COMPLETED
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      const task = await fastify.prisma.task.update({
        where: { id: taskId, farmId },
        data: updateData,
        include: {
          orderItem: { include: { product: true } },
        },
      });

      // Update order item status based on task completion
      if (task.orderItemId && data.status === 'COMPLETED') {
        const statusMap: Record<string, string> = {
          SOAK: 'SOAKING',
          SEED: 'GERMINATING',
          MOVE_TO_LIGHT: 'GROWING',
          HARVESTING: 'HARVESTED',
        };

        const newStatus = statusMap[task.type];
        if (newStatus) {
          await fastify.prisma.orderItem.update({
            where: { id: task.orderItemId },
            data: { status: newStatus as any },
          });

          // If harvested, check if all items in order are harvested
          if (newStatus === 'HARVESTED') {
            const order = await fastify.prisma.order.findFirst({
              where: { items: { some: { id: task.orderItemId } } },
              include: { items: true },
            });

            if (order) {
              const allHarvested = order.items.every(
                (item) => item.id === task.orderItemId || item.status === 'HARVESTED'
              );
              if (allHarvested) {
                await fastify.prisma.order.update({
                  where: { id: order.id },
                  data: { status: 'READY' },
                });
              }
            }
          }
        }
      }

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Complete task with log data
  fastify.post('/farms/:farmId/tasks/:taskId/complete', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, taskId } = request.params as { farmId: string; taskId: string };
      const { completedBy, completionNotes, actualTrays, actualYieldOz, seedLot, completedAt } = request.body as {
        completedBy: string;
        completionNotes?: string;
        actualTrays?: number;
        actualYieldOz?: number;
        seedLot?: string;
        completedAt?: string;
      };

      if (!completedBy?.trim()) {
        return reply.status(400).send({
          success: false,
          error: 'Completed by name is required',
        });
      }

      // Get the task first to check its type
      const existingTask = await fastify.prisma.task.findUnique({
        where: { id: taskId, farmId },
        include: { orderItem: true },
      });

      if (!existingTask) {
        return reply.status(404).send({
          success: false,
          error: 'Task not found',
        });
      }

      // Update the task with completion data
      const task = await fastify.prisma.task.update({
        where: { id: taskId, farmId },
        data: {
          status: 'COMPLETED',
          completedAt: completedAt ? new Date(completedAt) : new Date(),
          completedBy: completedBy.trim(),
          completionNotes: completionNotes?.trim() || null,
          actualTrays: actualTrays || null,
          seedLot: seedLot?.trim() || null,
        },
        include: {
          orderItem: { include: { product: true, order: true } },
        },
      });

      // Update order item based on task type
      if (task.orderItemId) {
        const statusMap: Record<string, string> = {
          SOAK: 'SOAKING',
          SEED: 'GERMINATING',
          MOVE_TO_LIGHT: 'GROWING',
          HARVESTING: 'HARVESTED',
        };

        const newStatus = statusMap[task.type];
        const updateData: any = { status: newStatus };

        // For harvest tasks, also update the actual yield
        if (task.type === 'HARVESTING' && actualYieldOz != null) {
          updateData.actualYieldOz = actualYieldOz;
        }

        if (actualTrays != null) {
          updateData.actualTrays = actualTrays;
        }

        // For SEED tasks, store the seedLot on the OrderItem for traceability
        if (task.type === 'SEED' && seedLot) {
          updateData.seedLot = seedLot;
        }

        await fastify.prisma.orderItem.update({
          where: { id: task.orderItemId },
          data: updateData,
        });

        // If harvested, check if all items in order are harvested
        if (newStatus === 'HARVESTED') {
          const order = await fastify.prisma.order.findFirst({
            where: { items: { some: { id: task.orderItemId } } },
            include: { items: true },
          });

          if (order) {
            const allHarvested = order.items.every(
              (item) => item.id === task.orderItemId || item.status === 'HARVESTED'
            );
            if (allHarvested) {
              await fastify.prisma.order.update({
                where: { id: order.id },
                data: { status: 'READY' },
              });
            }
          }

          // Free up rack locations when harvested
          await fastify.prisma.rackAssignment.updateMany({
            where: {
              orderItemId: task.orderItemId,
              isActive: true,
            },
            data: {
              isActive: false,
              removedAt: new Date(),
            },
          });

          // Update product's average yield per tray based on actual harvest data
          if (actualYieldOz != null && actualTrays != null && actualTrays > 0) {
            const yieldPerTray = actualYieldOz / actualTrays;

            // Get the product associated with this order item
            const orderItem = await fastify.prisma.orderItem.findUnique({
              where: { id: task.orderItemId },
              select: { productId: true },
            });

            if (orderItem?.productId) {
              // Get the current product
              const product = await fastify.prisma.product.findUnique({
                where: { id: orderItem.productId },
              });

              if (product) {
                // Calculate new average yield using exponential moving average
                // Weight recent data more heavily (alpha = 0.3 means 30% weight on new data)
                const alpha = 0.3;
                const currentAvg = product.avgYieldPerTray ?? yieldPerTray;
                const newAvgYield = alpha * yieldPerTray + (1 - alpha) * currentAvg;

                await fastify.prisma.product.update({
                  where: { id: orderItem.productId },
                  data: { avgYieldPerTray: newAvgYield },
                });
              }
            }
          }
        }
      }

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default farmsRoutes;
