import { FastifyPluginAsync } from 'fastify';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError } from '../../lib/errors.js';

const employeesRoutes: FastifyPluginAsync = async (fastify) => {
  // List employees
  fastify.get('/farms/:farmId/employees', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { search, status, position } = request.query as {
        search?: string;
        status?: string;
        position?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const employees = await fastify.prisma.employee.findMany({
        where: {
          farmId,
          ...(search && {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          }),
          ...(status && { status: status as any }),
          ...(position && { position }),
        },
        include: {
          farmUser: {
            select: {
              id: true,
              role: true,
            },
          },
          _count: {
            select: {
              shifts: true,
              timeEntries: true,
            },
          },
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      });

      return {
        success: true,
        data: employees,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single employee
  fastify.get('/farms/:farmId/employees/:employeeId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, employeeId } = request.params as { farmId: string; employeeId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const employee = await fastify.prisma.employee.findUnique({
        where: { id: employeeId, farmId },
        include: {
          farmUser: {
            select: {
              id: true,
              role: true,
            },
          },
          _count: {
            select: {
              shifts: true,
              timeEntries: true,
            },
          },
        },
      });

      if (!employee) {
        throw new NotFoundError('Employee', employeeId);
      }

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create employee
  fastify.post('/farms/:farmId/employees', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateEmployeeSchema.parse(request.body);

      // Handle empty email/phone strings
      const employeeData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position,
        department: data.department || null,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        hourlyRate: data.hourlyRate ?? null,
        status: data.status,
      };

      const employee = await fastify.prisma.employee.create({
        data: {
          ...employeeData,
          farmId,
        },
        include: {
          farmUser: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: employee,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update employee
  fastify.patch('/farms/:farmId/employees/:employeeId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, employeeId } = request.params as { farmId: string; employeeId: string };
      const data = UpdateEmployeeSchema.parse(request.body);

      // Handle optional fields
      const updateData: Record<string, any> = {};

      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.department !== undefined) updateData.department = data.department || null;
      if (data.hireDate !== undefined) updateData.hireDate = data.hireDate ? new Date(data.hireDate) : null;
      if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate ?? null;
      if (data.status !== undefined) updateData.status = data.status;

      const employee = await fastify.prisma.employee.update({
        where: { id: employeeId, farmId },
        data: updateData,
        include: {
          farmUser: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete employee (soft delete - set status to TERMINATED)
  fastify.delete('/farms/:farmId/employees/:employeeId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, employeeId } = request.params as { farmId: string; employeeId: string };

      // Soft delete by setting status to TERMINATED
      const employee = await fastify.prisma.employee.update({
        where: { id: employeeId, farmId },
        data: { status: 'TERMINATED' },
      });

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default employeesRoutes;
