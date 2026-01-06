import { FastifyPluginAsync } from 'fastify';
import {
  CreateDeliveryRouteSchema,
  UpdateDeliveryRouteSchema,
  AddOrderToRouteSchema,
  ReorderRouteStopsSchema,
  UpdateOrderFulfillmentSchema,
  CaptureSignatureSchema,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // DELIVERY ROUTES CRUD
  // ============================================================================

  // List delivery routes
  fastify.get('/farms/:farmId/delivery-routes', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { date, status, driverId } = request.query as {
        date?: string;
        status?: string;
        driverId?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const routes = await fastify.prisma.deliveryRoute.findMany({
        where: {
          farmId,
          ...(date && { date: new Date(date) }),
          ...(status && { status: status as any }),
          ...(driverId && { driverId }),
        },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              deliveryAddress: true,
              deliveryStopOrder: true,
              fulfillmentStatus: true,
            },
            orderBy: {
              deliveryStopOrder: 'asc',
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      return {
        success: true,
        data: routes,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single delivery route
  fastify.get('/farms/:farmId/delivery-routes/:routeId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const route = await fastify.prisma.deliveryRoute.findFirst({
        where: {
          id: routeId,
          farmId,
        },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              deliveryAddress: true,
              deliveryStopOrder: true,
              deliveryNotes: true,
              fulfillmentStatus: true,
              paymentType: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
            orderBy: {
              deliveryStopOrder: 'asc',
            },
          },
        },
      });

      if (!route) {
        throw new NotFoundError('Delivery route not found');
      }

      return {
        success: true,
        data: route,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create delivery route
  fastify.post('/farms/:farmId/delivery-routes', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const body = request.body as any;

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const parsed = CreateDeliveryRouteSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0]?.message || 'Invalid input');
      }

      const { orderIds, ...routeData } = parsed.data;

      const route = await fastify.prisma.deliveryRoute.create({
        data: {
          farmId,
          ...routeData,
        },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Add orders to route if provided
      if (orderIds && orderIds.length > 0) {
        await fastify.prisma.order.updateMany({
          where: {
            id: { in: orderIds },
            farmId,
          },
          data: {
            deliveryRouteId: route.id,
          },
        });

        // Set stop orders
        for (let i = 0; i < orderIds.length; i++) {
          await fastify.prisma.order.update({
            where: { id: orderIds[i] },
            data: { deliveryStopOrder: i },
          });
        }
      }

      return {
        success: true,
        data: route,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update delivery route
  fastify.patch('/farms/:farmId/delivery-routes/:routeId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };
      const body = request.body as any;

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const existing = await fastify.prisma.deliveryRoute.findFirst({
        where: { id: routeId, farmId },
      });

      if (!existing) {
        throw new NotFoundError('Delivery route not found');
      }

      const parsed = UpdateDeliveryRouteSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0]?.message || 'Invalid input');
      }

      const route = await fastify.prisma.deliveryRoute.update({
        where: { id: routeId },
        data: parsed.data,
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        success: true,
        data: route,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete delivery route
  fastify.delete('/farms/:farmId/delivery-routes/:routeId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const existing = await fastify.prisma.deliveryRoute.findFirst({
        where: { id: routeId, farmId },
      });

      if (!existing) {
        throw new NotFoundError('Delivery route not found');
      }

      // Remove orders from route first
      await fastify.prisma.order.updateMany({
        where: { deliveryRouteId: routeId },
        data: {
          deliveryRouteId: null,
          deliveryStopOrder: null,
        },
      });

      await fastify.prisma.deliveryRoute.delete({
        where: { id: routeId },
      });

      return {
        success: true,
        message: 'Delivery route deleted',
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // ROUTE OPERATIONS
  // ============================================================================

  // Add order to route
  fastify.post('/farms/:farmId/delivery-routes/:routeId/orders', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };
      const body = request.body as any;

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const parsed = AddOrderToRouteSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0]?.message || 'Invalid input');
      }

      const route = await fastify.prisma.deliveryRoute.findFirst({
        where: { id: routeId, farmId },
        include: {
          orders: {
            select: { id: true },
          },
        },
      });

      if (!route) {
        throw new NotFoundError('Delivery route not found');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: parsed.data.orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Calculate stop order
      const stopOrder = parsed.data.stopOrder ?? route.orders.length;

      await fastify.prisma.order.update({
        where: { id: parsed.data.orderId },
        data: {
          deliveryRouteId: routeId,
          deliveryStopOrder: stopOrder,
        },
      });

      return {
        success: true,
        message: 'Order added to route',
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Remove order from route
  fastify.delete('/farms/:farmId/delivery-routes/:routeId/orders/:orderId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, routeId, orderId } = request.params as {
        farmId: string;
        routeId: string;
        orderId: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId, deliveryRouteId: routeId },
      });

      if (!order) {
        throw new NotFoundError('Order not found in route');
      }

      await fastify.prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryRouteId: null,
          deliveryStopOrder: null,
        },
      });

      return {
        success: true,
        message: 'Order removed from route',
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Reorder route stops
  fastify.put('/farms/:farmId/delivery-routes/:routeId/reorder', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };
      const body = request.body as any;

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const parsed = ReorderRouteStopsSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0]?.message || 'Invalid input');
      }

      const route = await fastify.prisma.deliveryRoute.findFirst({
        where: { id: routeId, farmId },
      });

      if (!route) {
        throw new NotFoundError('Delivery route not found');
      }

      // Update stop orders
      for (let i = 0; i < parsed.data.orderIds.length; i++) {
        await fastify.prisma.order.update({
          where: { id: parsed.data.orderIds[i] },
          data: { deliveryStopOrder: i },
        });
      }

      return {
        success: true,
        message: 'Route stops reordered',
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Start route
  fastify.post('/farms/:farmId/delivery-routes/:routeId/start', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const route = await fastify.prisma.deliveryRoute.findFirst({
        where: { id: routeId, farmId },
      });

      if (!route) {
        throw new NotFoundError('Delivery route not found');
      }

      if (route.status !== 'PLANNED') {
        throw new BadRequestError('Route is not in PLANNED status');
      }

      const updated = await fastify.prisma.deliveryRoute.update({
        where: { id: routeId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Update all orders to OUT_FOR_DELIVERY
      await fastify.prisma.order.updateMany({
        where: { deliveryRouteId: routeId },
        data: { fulfillmentStatus: 'OUT_FOR_DELIVERY' },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Complete route
  fastify.post('/farms/:farmId/delivery-routes/:routeId/complete', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, routeId } = request.params as { farmId: string; routeId: string };
      const body = request.body as { actualDuration?: number; actualMiles?: number };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const route = await fastify.prisma.deliveryRoute.findFirst({
        where: { id: routeId, farmId },
      });

      if (!route) {
        throw new NotFoundError('Delivery route not found');
      }

      if (route.status !== 'IN_PROGRESS') {
        throw new BadRequestError('Route is not in progress');
      }

      const updated = await fastify.prisma.deliveryRoute.update({
        where: { id: routeId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualDuration: body.actualDuration,
          actualMiles: body.actualMiles,
        },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // ORDER FULFILLMENT
  // ============================================================================

  // Update order fulfillment
  fastify.patch('/farms/:farmId/orders/:orderId/fulfillment', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const body = request.body as any;

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const parsed = UpdateOrderFulfillmentSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0]?.message || 'Invalid input');
      }

      const updated = await fastify.prisma.order.update({
        where: { id: orderId },
        data: parsed.data,
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Mark order ready for pickup/delivery
  fastify.post('/farms/:farmId/orders/:orderId/ready', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const updated = await fastify.prisma.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: 'READY_FOR_PICKUP' },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Mark order as delivered
  fastify.post('/farms/:farmId/orders/:orderId/deliver', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const updated = await fastify.prisma.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: 'DELIVERED' },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Mark order as picked up
  fastify.post('/farms/:farmId/orders/:orderId/pickup', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const updated = await fastify.prisma.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: 'PICKED_UP' },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // SIGNATURE CAPTURE
  // ============================================================================

  // Capture delivery signature
  fastify.post('/farms/:farmId/orders/:orderId/signature', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const body = request.body as any;

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const parsed = CaptureSignatureSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0]?.message || 'Invalid input');
      }

      // Check if signature already exists
      const existing = await fastify.prisma.deliverySignature.findUnique({
        where: { orderId },
      });

      if (existing) {
        throw new BadRequestError('Signature already captured for this order');
      }

      const signature = await fastify.prisma.deliverySignature.create({
        data: {
          orderId,
          signatureData: parsed.data.signatureData,
          signedBy: parsed.data.signedBy,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          photoUrl: parsed.data.photoUrl,
          capturedBy: request.userId,
        },
      });

      // Update order status to DELIVERED
      await fastify.prisma.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: 'DELIVERED' },
      });

      return {
        success: true,
        data: signature,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get delivery signature
  fastify.get('/farms/:farmId/orders/:orderId/signature', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const order = await fastify.prisma.order.findFirst({
        where: { id: orderId, farmId },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const signature = await fastify.prisma.deliverySignature.findUnique({
        where: { orderId },
      });

      return {
        success: true,
        data: signature,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // DRIVER HELPERS
  // ============================================================================

  // Get drivers (employees with DRIVER position)
  fastify.get('/farms/:farmId/drivers', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const drivers = await fastify.prisma.employee.findMany({
        where: {
          farmId,
          position: 'DRIVER',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      });

      return {
        success: true,
        data: drivers,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get today's routes for a driver
  fastify.get('/farms/:farmId/drivers/:driverId/routes', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, driverId } = request.params as { farmId: string; driverId: string };
      const { date } = request.query as { date?: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const routes = await fastify.prisma.deliveryRoute.findMany({
        where: {
          farmId,
          driverId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          orders: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              deliveryAddress: true,
              deliveryStopOrder: true,
              deliveryNotes: true,
              fulfillmentStatus: true,
              paymentType: true,
              customer: {
                select: {
                  phone: true,
                },
              },
            },
            orderBy: {
              deliveryStopOrder: 'asc',
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return {
        success: true,
        data: routes,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get orders ready for delivery (unassigned to routes)
  fastify.get('/farms/:farmId/orders/ready-for-delivery', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const orders = await fastify.prisma.order.findMany({
        where: {
          farmId,
          fulfillmentMethod: 'FARM_DELIVERY',
          fulfillmentStatus: { in: ['PENDING', 'READY_FOR_PICKUP'] },
          deliveryRouteId: null,
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          deliveryAddress: true,
          deliveryDate: true,
          deliveryNotes: true,
          paymentType: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
        },
        orderBy: { deliveryDate: 'asc' },
      });

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default deliveryRoutes;
