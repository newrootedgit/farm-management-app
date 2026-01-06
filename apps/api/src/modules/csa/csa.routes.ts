import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { NotFoundError, BadRequestError } from '../../lib/errors.js';
import {
  CreateCsaProgramSchema,
  UpdateCsaProgramSchema,
  CreateCsaShareTypeSchema,
  UpdateCsaShareTypeSchema,
  EnrollCsaMemberSchema,
  UpdateCsaMemberSchema,
  RecordCsaPaymentSchema,
  SetMemberPreferenceSchema,
  CreateCsaPickupLocationSchema,
  UpdateCsaPickupLocationSchema,
  UpdateCsaWeekSchema,
  SetWeekAllocationSchema,
  BulkSetWeekAllocationsSchema,
  SkipWeekSchema,
} from '@farm/shared';

// ============================================================================
// CSA MANAGEMENT ROUTES
// ============================================================================

const csaRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // ==========================================================================
  // PROGRAMS
  // ==========================================================================

  // List CSA programs for a farm
  fastify.get<{
    Params: { farmId: string };
    Querystring: { status?: string; includeStats?: string };
  }>(
    '/farms/:farmId/csa/programs',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId } = request.params;
      const { status, includeStats } = request.query;

      const where: any = { farmId };
      if (status) {
        where.status = status;
      }

      const programs = await prisma.csaProgram.findMany({
        where,
        include: {
          shareTypes: {
            orderBy: { displayOrder: 'asc' },
          },
          pickupLocations: {
            where: { isActive: true },
          },
          _count: includeStats === 'true' ? {
            select: {
              members: true,
              weeks: true,
            },
          } : undefined,
        },
        orderBy: { startDate: 'desc' },
      });

      return programs;
    }
  );

  // Get single program with full details
  fastify.get<{
    Params: { farmId: string; programId: string };
  }>(
    '/farms/:farmId/csa/programs/:programId',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId, programId } = request.params;

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
        include: {
          shareTypes: {
            orderBy: { displayOrder: 'asc' },
            include: {
              _count: {
                select: { members: true },
              },
            },
          },
          pickupLocations: true,
          weeks: {
            orderBy: { weekNumber: 'asc' },
          },
          _count: {
            select: {
              members: true,
              weeks: true,
            },
          },
        },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      return program;
    }
  );

  // Create CSA program
  fastify.post<{
    Params: { farmId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/programs',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId } = request.params;
      const data = CreateCsaProgramSchema.parse(request.body);

      const program = await prisma.csaProgram.create({
        data: {
          ...data,
          farmId,
          status: 'DRAFT',
        },
        include: {
          shareTypes: true,
          pickupLocations: true,
        },
      });

      reply.status(201);
      return program;
    }
  );

  // Update CSA program
  fastify.patch<{
    Params: { farmId: string; programId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/programs/:programId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, programId } = request.params;
      const data = UpdateCsaProgramSchema.parse(request.body);

      const existing = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
      });

      if (!existing) {
        throw new NotFoundError('CSA program not found');
      }

      const program = await prisma.csaProgram.update({
        where: { id: programId },
        data,
        include: {
          shareTypes: true,
          pickupLocations: true,
        },
      });

      return program;
    }
  );

  // Delete CSA program (only if draft and no members)
  fastify.delete<{
    Params: { farmId: string; programId: string };
  }>(
    '/farms/:farmId/csa/programs/:programId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId, programId } = request.params;

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
        include: {
          _count: { select: { members: true } },
        },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      if (program.status !== 'DRAFT') {
        throw new BadRequestError('Only draft programs can be deleted');
      }

      if (program._count.members > 0) {
        throw new BadRequestError('Cannot delete program with enrolled members');
      }

      await prisma.csaProgram.delete({
        where: { id: programId },
      });

      reply.status(204);
    }
  );

  // Generate weeks for a program
  fastify.post<{
    Params: { farmId: string; programId: string };
  }>(
    '/farms/:farmId/csa/programs/:programId/generate-weeks',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, programId } = request.params;

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
        include: { weeks: true },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      if (program.weeks.length > 0) {
        throw new BadRequestError('Weeks already generated for this program');
      }

      // Calculate weeks between start and end date
      const startDate = new Date(program.startDate);
      const endDate = new Date(program.endDate);
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const numberOfWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerWeek);

      // Create weeks
      const weeks = [];
      for (let i = 0; i < numberOfWeeks; i++) {
        const weekDate = new Date(startDate.getTime() + i * msPerWeek);
        weeks.push({
          programId,
          weekNumber: i + 1,
          weekDate,
          status: 'PLANNING' as const,
        });
      }

      await prisma.csaWeek.createMany({
        data: weeks,
      });

      const createdWeeks = await prisma.csaWeek.findMany({
        where: { programId },
        orderBy: { weekNumber: 'asc' },
      });

      return createdWeeks;
    }
  );

  // ==========================================================================
  // SHARE TYPES
  // ==========================================================================

  // Create share type
  fastify.post<{
    Params: { farmId: string; programId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/programs/:programId/share-types',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId, programId } = request.params;
      const data = CreateCsaShareTypeSchema.parse(request.body);

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      // Get max display order
      const maxOrder = await prisma.csaShareType.aggregate({
        where: { programId },
        _max: { displayOrder: true },
      });

      const shareType = await prisma.csaShareType.create({
        data: {
          ...data,
          programId,
          displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
        },
      });

      reply.status(201);
      return shareType;
    }
  );

  // Update share type
  fastify.patch<{
    Params: { farmId: string; shareTypeId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/share-types/:shareTypeId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, shareTypeId } = request.params;
      const data = UpdateCsaShareTypeSchema.parse(request.body);

      const shareType = await prisma.csaShareType.findFirst({
        where: { id: shareTypeId },
        include: { program: true },
      });

      if (!shareType || shareType.program.farmId !== farmId) {
        throw new NotFoundError('Share type not found');
      }

      return prisma.csaShareType.update({
        where: { id: shareTypeId },
        data,
      });
    }
  );

  // Delete share type
  fastify.delete<{
    Params: { farmId: string; shareTypeId: string };
  }>(
    '/farms/:farmId/csa/share-types/:shareTypeId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId, shareTypeId } = request.params;

      const shareType = await prisma.csaShareType.findFirst({
        where: { id: shareTypeId },
        include: {
          program: true,
          _count: { select: { members: true } },
        },
      });

      if (!shareType || shareType.program.farmId !== farmId) {
        throw new NotFoundError('Share type not found');
      }

      if (shareType._count.members > 0) {
        throw new BadRequestError('Cannot delete share type with enrolled members');
      }

      await prisma.csaShareType.delete({
        where: { id: shareTypeId },
      });

      reply.status(204);
    }
  );

  // ==========================================================================
  // MEMBERS
  // ==========================================================================

  // List members for a program
  fastify.get<{
    Params: { farmId: string; programId: string };
    Querystring: { status?: string; shareTypeId?: string };
  }>(
    '/farms/:farmId/csa/programs/:programId/members',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId, programId } = request.params;
      const { status, shareTypeId } = request.query;

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      const where: any = { programId };
      if (status) where.status = status;
      if (shareTypeId) where.shareTypeId = shareTypeId;

      const members = await prisma.csaMember.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
          shareType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          pickupLocation: true,
        },
        orderBy: { enrolledAt: 'desc' },
      });

      return members;
    }
  );

  // Get single member
  fastify.get<{
    Params: { farmId: string; memberId: string };
  }>(
    '/farms/:farmId/csa/members/:memberId',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId, memberId } = request.params;

      const member = await prisma.csaMember.findFirst({
        where: { id: memberId },
        include: {
          program: {
            select: { id: true, name: true, farmId: true },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
          shareType: true,
          pickupLocation: true,
          preferences: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
          skippedWeeks: {
            include: {
              week: {
                select: { id: true, weekNumber: true, weekDate: true },
              },
            },
          },
        },
      });

      if (!member || member.program.farmId !== farmId) {
        throw new NotFoundError('Member not found');
      }

      return member;
    }
  );

  // Enroll member in program
  fastify.post<{
    Params: { farmId: string; programId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/programs/:programId/members',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId, programId } = request.params;
      const data = EnrollCsaMemberSchema.parse(request.body);

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      if (program.status !== 'OPEN_ENROLLMENT' && program.status !== 'ACTIVE') {
        throw new BadRequestError('Program is not open for enrollment');
      }

      // Check for existing enrollment
      const existing = await prisma.csaMember.findFirst({
        where: { programId, customerId: data.customerId },
      });

      if (existing) {
        throw new BadRequestError('Customer is already enrolled in this program');
      }

      // Verify share type exists
      const shareType = await prisma.csaShareType.findFirst({
        where: { id: data.shareTypeId, programId },
      });

      if (!shareType) {
        throw new NotFoundError('Share type not found');
      }

      // Check max members limit
      if (shareType.maxMembers) {
        const currentCount = await prisma.csaMember.count({
          where: { shareTypeId: data.shareTypeId, status: 'ACTIVE' },
        });

        if (currentCount >= shareType.maxMembers) {
          throw new BadRequestError('Share type is at maximum capacity');
        }
      }

      // Verify pickup location if provided
      if (data.pickupLocationId) {
        const location = await prisma.csaPickupLocation.findFirst({
          where: { id: data.pickupLocationId, programId, isActive: true },
        });

        if (!location) {
          throw new NotFoundError('Pickup location not found');
        }
      }

      const member = await prisma.csaMember.create({
        data: {
          programId,
          customerId: data.customerId,
          shareTypeId: data.shareTypeId,
          fulfillmentMethod: data.fulfillmentMethod,
          pickupLocationId: data.pickupLocationId,
          notes: data.notes,
          paymentStatus: 'PENDING',
          paidAmount: 0,
          status: 'ACTIVE',
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          shareType: true,
          pickupLocation: true,
        },
      });

      reply.status(201);
      return member;
    }
  );

  // Update member
  fastify.patch<{
    Params: { farmId: string; memberId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/members/:memberId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, memberId } = request.params;
      const data = UpdateCsaMemberSchema.parse(request.body);

      const member = await prisma.csaMember.findFirst({
        where: { id: memberId },
        include: { program: true },
      });

      if (!member || member.program.farmId !== farmId) {
        throw new NotFoundError('Member not found');
      }

      return prisma.csaMember.update({
        where: { id: memberId },
        data,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          shareType: true,
          pickupLocation: true,
        },
      });
    }
  );

  // Record payment for member
  fastify.post<{
    Params: { farmId: string; memberId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/members/:memberId/payment',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, memberId } = request.params;
      const data = RecordCsaPaymentSchema.parse(request.body);

      const member = await prisma.csaMember.findFirst({
        where: { id: memberId },
        include: {
          program: true,
          shareType: true,
        },
      });

      if (!member || member.program.farmId !== farmId) {
        throw new NotFoundError('Member not found');
      }

      const newPaidAmount = member.paidAmount + data.amount;
      const totalDue = member.shareType.price;

      let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PARTIAL';
      if (newPaidAmount >= totalDue) {
        paymentStatus = 'PAID';
      } else if (newPaidAmount === 0) {
        paymentStatus = 'PENDING';
      }

      return prisma.csaMember.update({
        where: { id: memberId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus,
          paymentNotes: data.notes
            ? `${member.paymentNotes || ''}\n${new Date().toISOString()}: ${data.notes}`
            : member.paymentNotes,
        },
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          shareType: true,
        },
      });
    }
  );

  // Set member preferences
  fastify.post<{
    Params: { farmId: string; memberId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/members/:memberId/preferences',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId, memberId } = request.params;
      const data = SetMemberPreferenceSchema.parse(request.body);

      const member = await prisma.csaMember.findFirst({
        where: { id: memberId },
        include: { program: true },
      });

      if (!member || member.program.farmId !== farmId) {
        throw new NotFoundError('Member not found');
      }

      // Upsert preference
      const preference = await prisma.csaMemberPreference.upsert({
        where: {
          memberId_productId: {
            memberId,
            productId: data.productId,
          },
        },
        update: {
          preference: data.preference,
          notes: data.notes,
        },
        create: {
          memberId,
          productId: data.productId,
          preference: data.preference,
          notes: data.notes,
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });

      return preference;
    }
  );

  // Skip a week
  fastify.post<{
    Params: { farmId: string; memberId: string; weekId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/members/:memberId/skip/:weekId',
    { preHandler: [requireAuth()] },
    async (request, reply) => {
      const { farmId, memberId, weekId } = request.params;
      const data = SkipWeekSchema.parse(request.body);

      const member = await prisma.csaMember.findFirst({
        where: { id: memberId },
        include: { program: true },
      });

      if (!member || member.program.farmId !== farmId) {
        throw new NotFoundError('Member not found');
      }

      const week = await prisma.csaWeek.findFirst({
        where: { id: weekId, programId: member.programId },
      });

      if (!week) {
        throw new NotFoundError('Week not found');
      }

      if (week.status === 'DISTRIBUTED') {
        throw new BadRequestError('Cannot skip a distributed week');
      }

      const skip = await prisma.csaMemberSkip.create({
        data: {
          memberId,
          weekId,
          reason: data.reason,
        },
        include: {
          week: {
            select: { weekNumber: true, weekDate: true },
          },
        },
      });

      reply.status(201);
      return skip;
    }
  );

  // Cancel skip
  fastify.delete<{
    Params: { farmId: string; memberId: string; weekId: string };
  }>(
    '/farms/:farmId/csa/members/:memberId/skip/:weekId',
    { preHandler: [requireAuth()] },
    async (request, reply) => {
      const { farmId, memberId, weekId } = request.params;

      const member = await prisma.csaMember.findFirst({
        where: { id: memberId },
        include: { program: true },
      });

      if (!member || member.program.farmId !== farmId) {
        throw new NotFoundError('Member not found');
      }

      await prisma.csaMemberSkip.deleteMany({
        where: { memberId, weekId },
      });

      reply.status(204);
    }
  );

  // ==========================================================================
  // PICKUP LOCATIONS
  // ==========================================================================

  // Create pickup location
  fastify.post<{
    Params: { farmId: string; programId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/programs/:programId/locations',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId, programId } = request.params;
      const data = CreateCsaPickupLocationSchema.parse(request.body);

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      const location = await prisma.csaPickupLocation.create({
        data: {
          ...data,
          programId,
          isActive: true,
        },
      });

      reply.status(201);
      return location;
    }
  );

  // Update pickup location
  fastify.patch<{
    Params: { farmId: string; locationId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/locations/:locationId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, locationId } = request.params;
      const data = UpdateCsaPickupLocationSchema.parse(request.body);

      const location = await prisma.csaPickupLocation.findFirst({
        where: { id: locationId },
        include: { program: true },
      });

      if (!location || location.program.farmId !== farmId) {
        throw new NotFoundError('Pickup location not found');
      }

      return prisma.csaPickupLocation.update({
        where: { id: locationId },
        data,
      });
    }
  );

  // Delete pickup location
  fastify.delete<{
    Params: { farmId: string; locationId: string };
  }>(
    '/farms/:farmId/csa/locations/:locationId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request, reply) => {
      const { farmId, locationId } = request.params;

      const location = await prisma.csaPickupLocation.findFirst({
        where: { id: locationId },
        include: {
          program: true,
          _count: { select: { members: true } },
        },
      });

      if (!location || location.program.farmId !== farmId) {
        throw new NotFoundError('Pickup location not found');
      }

      if (location._count.members > 0) {
        // Deactivate instead of delete
        await prisma.csaPickupLocation.update({
          where: { id: locationId },
          data: { isActive: false },
        });
      } else {
        await prisma.csaPickupLocation.delete({
          where: { id: locationId },
        });
      }

      reply.status(204);
    }
  );

  // ==========================================================================
  // WEEKS
  // ==========================================================================

  // List weeks for a program
  fastify.get<{
    Params: { farmId: string; programId: string };
    Querystring: { status?: string };
  }>(
    '/farms/:farmId/csa/programs/:programId/weeks',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId, programId } = request.params;
      const { status } = request.query;

      const program = await prisma.csaProgram.findFirst({
        where: { id: programId, farmId },
      });

      if (!program) {
        throw new NotFoundError('CSA program not found');
      }

      const where: any = { programId };
      if (status) where.status = status;

      const weeks = await prisma.csaWeek.findMany({
        where,
        include: {
          _count: {
            select: {
              allocations: true,
              skipRequests: true,
            },
          },
        },
        orderBy: { weekNumber: 'asc' },
      });

      return weeks;
    }
  );

  // Get single week with allocations
  fastify.get<{
    Params: { farmId: string; weekId: string };
  }>(
    '/farms/:farmId/csa/weeks/:weekId',
    { preHandler: [requireAuth()] },
    async (request) => {
      const { farmId, weekId } = request.params;

      const week = await prisma.csaWeek.findFirst({
        where: { id: weekId },
        include: {
          program: {
            select: { id: true, name: true, farmId: true },
          },
          allocations: {
            include: {
              product: {
                select: { id: true, name: true },
              },
              shareType: {
                select: { id: true, name: true },
              },
            },
          },
          skipRequests: {
            include: {
              member: {
                include: {
                  customer: {
                    select: { id: true, name: true },
                  },
                  shareType: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!week || week.program.farmId !== farmId) {
        throw new NotFoundError('Week not found');
      }

      return week;
    }
  );

  // Update week
  fastify.patch<{
    Params: { farmId: string; weekId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/weeks/:weekId',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, weekId } = request.params;
      const data = UpdateCsaWeekSchema.parse(request.body);

      const week = await prisma.csaWeek.findFirst({
        where: { id: weekId },
        include: { program: true },
      });

      if (!week || week.program.farmId !== farmId) {
        throw new NotFoundError('Week not found');
      }

      return prisma.csaWeek.update({
        where: { id: weekId },
        data,
      });
    }
  );

  // Set week allocations (bulk upsert)
  fastify.post<{
    Params: { farmId: string; weekId: string };
    Body: unknown;
  }>(
    '/farms/:farmId/csa/weeks/:weekId/allocations',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, weekId } = request.params;
      const data = BulkSetWeekAllocationsSchema.parse(request.body);

      const week = await prisma.csaWeek.findFirst({
        where: { id: weekId },
        include: { program: true },
      });

      if (!week || week.program.farmId !== farmId) {
        throw new NotFoundError('Week not found');
      }

      if (week.status === 'DISTRIBUTED') {
        throw new BadRequestError('Cannot modify allocations for a distributed week');
      }

      // Delete existing allocations for these share types
      const shareTypeIds = [...new Set(data.allocations.map((a) => a.shareTypeId))];
      await prisma.csaWeekAllocation.deleteMany({
        where: {
          weekId,
          shareTypeId: { in: shareTypeIds },
        },
      });

      // Create new allocations
      await prisma.csaWeekAllocation.createMany({
        data: data.allocations.map((a) => ({
          weekId,
          shareTypeId: a.shareTypeId,
          productId: a.productId,
          quantityOz: a.quantityOz,
        })),
      });

      // Return updated week
      return prisma.csaWeek.findUnique({
        where: { id: weekId },
        include: {
          allocations: {
            include: {
              product: { select: { id: true, name: true } },
              shareType: { select: { id: true, name: true } },
            },
          },
        },
      });
    }
  );

  // Finalize week
  fastify.post<{
    Params: { farmId: string; weekId: string };
  }>(
    '/farms/:farmId/csa/weeks/:weekId/finalize',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, weekId } = request.params;

      const week = await prisma.csaWeek.findFirst({
        where: { id: weekId },
        include: { program: true },
      });

      if (!week || week.program.farmId !== farmId) {
        throw new NotFoundError('Week not found');
      }

      if (week.status !== 'PLANNING') {
        throw new BadRequestError('Week is already finalized');
      }

      return prisma.csaWeek.update({
        where: { id: weekId },
        data: { status: 'FINALIZED' },
      });
    }
  );

  // Generate orders for a week
  fastify.post<{
    Params: { farmId: string; weekId: string };
  }>(
    '/farms/:farmId/csa/weeks/:weekId/generate-orders',
    { preHandler: [requireAuth(), requireRole('FARM_MANAGER')] },
    async (request) => {
      const { farmId, weekId } = request.params;

      const week = await prisma.csaWeek.findFirst({
        where: { id: weekId },
        include: {
          program: {
            include: {
              members: {
                where: { status: 'ACTIVE' },
                include: {
                  customer: true,
                  shareType: true,
                },
              },
            },
          },
          allocations: {
            include: {
              product: true,
            },
          },
          skipRequests: true,
        },
      });

      if (!week || week.program.farmId !== farmId) {
        throw new NotFoundError('Week not found');
      }

      if (week.status !== 'FINALIZED') {
        throw new BadRequestError('Week must be finalized before generating orders');
      }

      const skippingMemberIds = new Set(week.skipRequests.map((s) => s.memberId));
      const activeMembers = week.program.members.filter((m) => !skippingMemberIds.has(m.id));

      // Group allocations by share type
      const allocationsByShareType = week.allocations.reduce((acc, a) => {
        if (!acc[a.shareTypeId]) acc[a.shareTypeId] = [];
        acc[a.shareTypeId].push(a);
        return acc;
      }, {} as Record<string, typeof week.allocations>);

      // Generate order number prefix
      const orderPrefix = `CSA-W${week.weekNumber}`;

      // Create orders for each member
      const createdOrders = [];
      for (let i = 0; i < activeMembers.length; i++) {
        const member = activeMembers[i];
        const memberAllocations = allocationsByShareType[member.shareTypeId] || [];

        if (memberAllocations.length === 0) continue;

        const order = await prisma.order.create({
          data: {
            farmId,
            orderNumber: `${orderPrefix}-${String(i + 1).padStart(3, '0')}`,
            customerId: member.customerId,
            customerName: member.customer.name,
            status: 'PENDING',
            orderSource: 'CSA',
            paymentStatus: member.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID',
            paymentType: 'SUBSCRIPTION',
            fulfillmentMethod: member.fulfillmentMethod,
            deliveryDate: week.weekDate,
            notes: `CSA Week ${week.weekNumber} - ${member.shareType.name}`,
            items: {
              create: memberAllocations.map((a) => {
                // For CSA orders, use the week date for all production dates
                // since products are pre-produced and being distributed
                const weekDate = new Date(week.weekDate);
                return {
                  productId: a.productId,
                  quantityOz: a.quantityOz,
                  harvestDate: weekDate,
                  // Use same date for CSA since production is already done
                  soakDate: weekDate,
                  seedDate: weekDate,
                  moveToLightDate: weekDate,
                  // Default production values for CSA
                  traysNeeded: 1,
                  overagePercent: 0,
                };
              }),
            },
          },
          include: {
            items: true,
            customer: true,
          },
        });

        createdOrders.push(order);
      }

      // Mark week as distributed
      await prisma.csaWeek.update({
        where: { id: weekId },
        data: { status: 'DISTRIBUTED' },
      });

      return {
        ordersCreated: createdOrders.length,
        orders: createdOrders,
      };
    }
  );
};

export default csaRoutes;
