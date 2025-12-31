import { FastifyPluginAsync } from 'fastify';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateCustomerTagSchema,
  UpdateCustomerTagSchema,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError } from '../../lib/errors.js';

const customersRoutes: FastifyPluginAsync = async (fastify) => {
  // ====== CUSTOMER ROUTES ======

  // List customers
  fastify.get('/farms/:farmId/customers', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { search, customerType, isActive, tagId } = request.query as {
        search?: string;
        customerType?: string;
        isActive?: string;
        tagId?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const customers = await fastify.prisma.customer.findMany({
        where: {
          farmId,
          ...(search && {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { companyName: { contains: search } },
            ],
          }),
          ...(customerType && { customerType }),
          ...(isActive !== undefined && { isActive: isActive === 'true' }),
          ...(tagId && { tags: { some: { id: tagId } } }),
        },
        include: {
          tags: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: customers,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single customer
  fastify.get('/farms/:farmId/customers/:customerId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, customerId } = request.params as { farmId: string; customerId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const customer = await fastify.prisma.customer.findUnique({
        where: { id: customerId, farmId },
        include: {
          tags: true,
          _count: {
            select: { orders: true },
          },
        },
      });

      if (!customer) {
        throw new NotFoundError('Customer', customerId);
      }

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create customer
  fastify.post('/farms/:farmId/customers', {
    preHandler: [requireAuth(), requireRole('SALESPERSON')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { tagIds, ...data } = CreateCustomerSchema.parse(request.body);

      // Handle empty email string
      const customerData = {
        ...data,
        email: data.email || null,
      };

      const customer = await fastify.prisma.customer.create({
        data: {
          ...customerData,
          farmId,
          ...(tagIds && tagIds.length > 0 && {
            tags: {
              connect: tagIds.map(id => ({ id })),
            },
          }),
        },
        include: {
          tags: true,
          _count: {
            select: { orders: true },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: customer,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update customer
  fastify.patch('/farms/:farmId/customers/:customerId', {
    preHandler: [requireAuth(), requireRole('SALESPERSON')],
  }, async (request, reply) => {
    try {
      const { farmId, customerId } = request.params as { farmId: string; customerId: string };
      const { tagIds, ...data } = UpdateCustomerSchema.parse(request.body);

      // Handle empty email string
      const customerData = {
        ...data,
        ...(data.email !== undefined && { email: data.email || null }),
      };

      const customer = await fastify.prisma.customer.update({
        where: { id: customerId, farmId },
        data: {
          ...customerData,
          ...(tagIds !== undefined && {
            tags: {
              set: tagIds.map(id => ({ id })),
            },
          }),
        },
        include: {
          tags: true,
          _count: {
            select: { orders: true },
          },
        },
      });

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete customer (soft delete - set isActive to false)
  fastify.delete('/farms/:farmId/customers/:customerId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, customerId } = request.params as { farmId: string; customerId: string };

      // Soft delete by setting isActive to false
      const customer = await fastify.prisma.customer.update({
        where: { id: customerId, farmId },
        data: { isActive: false },
      });

      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get customer orders
  fastify.get('/farms/:farmId/customers/:customerId/orders', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, customerId } = request.params as { farmId: string; customerId: string };
      const { status, limit } = request.query as { status?: string; limit?: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Verify customer exists
      const customer = await fastify.prisma.customer.findUnique({
        where: { id: customerId, farmId },
      });

      if (!customer) {
        throw new NotFoundError('Customer', customerId);
      }

      const orders = await fastify.prisma.order.findMany({
        where: {
          farmId,
          customerId,
          ...(status && { status: status as any }),
        },
        include: {
          items: {
            include: {
              product: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...(limit && { take: parseInt(limit) }),
      });

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ====== CUSTOMER TAG ROUTES ======

  // List customer tags
  fastify.get('/farms/:farmId/customer-tags', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const tags = await fastify.prisma.customerTag.findMany({
        where: { farmId },
        include: {
          _count: {
            select: { customers: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: tags,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create customer tag
  fastify.post('/farms/:farmId/customer-tags', {
    preHandler: [requireAuth(), requireRole('SALESPERSON')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateCustomerTagSchema.parse(request.body);

      const tag = await fastify.prisma.customerTag.create({
        data: { ...data, farmId },
      });

      return reply.status(201).send({
        success: true,
        data: tag,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update customer tag
  fastify.patch('/farms/:farmId/customer-tags/:tagId', {
    preHandler: [requireAuth(), requireRole('SALESPERSON')],
  }, async (request, reply) => {
    try {
      const { farmId, tagId } = request.params as { farmId: string; tagId: string };
      const data = UpdateCustomerTagSchema.parse(request.body);

      const tag = await fastify.prisma.customerTag.update({
        where: { id: tagId, farmId },
        data,
      });

      return {
        success: true,
        data: tag,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete customer tag
  fastify.delete('/farms/:farmId/customer-tags/:tagId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, tagId } = request.params as { farmId: string; tagId: string };

      await fastify.prisma.customerTag.delete({
        where: { id: tagId, farmId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default customersRoutes;
