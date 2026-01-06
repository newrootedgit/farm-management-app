import { FastifyPluginAsync } from 'fastify';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError } from '../../lib/errors.js';

const employeesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get team members (owner + employees)
  fastify.get('/farms/:farmId/team', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Get the owner (FarmUser with role='OWNER')
      const owner = await fastify.prisma.farmUser.findFirst({
        where: {
          farmId,
          role: 'OWNER',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Get all employees
      const employees = await fastify.prisma.employee.findMany({
        where: { farmId },
        include: {
          farmUser: {
            select: {
              id: true,
              role: true,
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
        data: {
          owner: owner ? {
            id: owner.id,
            role: owner.role,
            userId: owner.userId,
            user: owner.user,
          } : null,
          employees,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

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

  // Send invite to employee
  fastify.post('/farms/:farmId/employees/:employeeId/invite', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, employeeId } = request.params as { farmId: string; employeeId: string };

      // Get employee
      const employee = await fastify.prisma.employee.findUnique({
        where: { id: employeeId, farmId },
        include: { farm: true },
      });

      if (!employee) {
        throw new NotFoundError('Employee', employeeId);
      }

      if (!employee.email) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Employee must have an email address to receive an invite' },
        });
      }

      // Generate invite token (UUID)
      const inviteToken = crypto.randomUUID();

      // Set expiration to 72 hours from now
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setHours(inviteExpiresAt.getHours() + 72);

      // Update employee with invite details
      const updatedEmployee = await fastify.prisma.employee.update({
        where: { id: employeeId },
        data: {
          inviteToken,
          inviteStatus: 'PENDING',
          inviteExpiresAt,
          invitedAt: new Date(),
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

      // TODO: Actually send the email/SMS here
      // For now, just log the invite link
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite/${inviteToken}`;
      fastify.log.info(`Invite link for ${employee.email}: ${inviteLink}`);

      return {
        success: true,
        data: updatedEmployee,
        // Include invite link in dev mode for testing
        ...(process.env.NODE_ENV !== 'production' && { inviteLink }),
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Accept invite (public - no auth required)
  fastify.post('/invites/:token/accept', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const { password } = request.body as { password: string };

      if (!password || password.length < 6) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' },
        });
      }

      // Find employee by invite token
      const employee = await fastify.prisma.employee.findUnique({
        where: { inviteToken: token },
        include: { farm: true },
      });

      if (!employee) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invalid or expired invite link' },
        });
      }

      // Check if invite is expired
      if (employee.inviteExpiresAt && new Date() > employee.inviteExpiresAt) {
        await fastify.prisma.employee.update({
          where: { id: employee.id },
          data: { inviteStatus: 'EXPIRED' },
        });

        return reply.status(400).send({
          success: false,
          error: { code: 'EXPIRED', message: 'This invite link has expired. Please request a new one.' },
        });
      }

      // Check if already accepted
      if (employee.inviteStatus === 'ACCEPTED') {
        return reply.status(400).send({
          success: false,
          error: { code: 'ALREADY_ACCEPTED', message: 'This invite has already been accepted' },
        });
      }

      // Create user account
      // TODO: Hash password properly when real auth is implemented
      const user = await fastify.prisma.user.create({
        data: {
          externalId: `emp-${employee.id}`, // Temporary - will be replaced with Clerk ID
          email: employee.email!,
          name: `${employee.firstName} ${employee.lastName}`,
        },
      });

      // Map employee position to FarmRole
      const roleMap: Record<string, string> = {
        FARM_MANAGER: 'FARM_MANAGER',
        SALESPERSON: 'SALESPERSON',
        FARM_OPERATOR: 'FARM_OPERATOR',
      };
      const role = roleMap[employee.position ?? ''] || 'FARM_OPERATOR';

      // Create FarmUser relationship
      const farmUser = await fastify.prisma.farmUser.create({
        data: {
          userId: user.id,
          farmId: employee.farmId,
          role: role as any,
        },
      });

      // Update employee to mark invite as accepted and link to farmUser
      const updatedEmployee = await fastify.prisma.employee.update({
        where: { id: employee.id },
        data: {
          inviteStatus: 'ACCEPTED',
          acceptedAt: new Date(),
          inviteToken: null, // Clear token after use
          farmUserId: farmUser.id,
        },
      });

      return {
        success: true,
        data: {
          employee: updatedEmployee,
          user: { id: user.id, email: user.email, name: user.name },
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update owner details
  fastify.patch('/farms/:farmId/team/owner', {
    preHandler: [requireAuth(), requireRole('OWNER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { name, email } = request.body as { name?: string; email?: string };

      // Get the owner's FarmUser
      const ownerFarmUser = await fastify.prisma.farmUser.findFirst({
        where: {
          farmId,
          role: 'OWNER',
        },
      });

      if (!ownerFarmUser) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Owner not found' },
        });
      }

      // Update the user
      const updateData: { name?: string; email?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;

      const updatedUser = await fastify.prisma.user.update({
        where: { id: ownerFarmUser.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      });

      return {
        success: true,
        data: {
          id: ownerFarmUser.id,
          role: ownerFarmUser.role,
          userId: ownerFarmUser.userId,
          user: updatedUser,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get invite details (public - for showing accept invite page)
  fastify.get('/invites/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };

      const employee = await fastify.prisma.employee.findUnique({
        where: { inviteToken: token },
        include: {
          farm: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
      });

      if (!employee) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invalid or expired invite link' },
        });
      }

      // Check if expired
      const isExpired = employee.inviteExpiresAt && new Date() > employee.inviteExpiresAt;
      const isAccepted = employee.inviteStatus === 'ACCEPTED';

      return {
        success: true,
        data: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          position: employee.position,
          farm: employee.farm,
          isExpired,
          isAccepted,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default employeesRoutes;
