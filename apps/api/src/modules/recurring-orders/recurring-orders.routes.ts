import { FastifyPluginAsync } from 'fastify';
import {
  CreateRecurringOrderScheduleSchema,
  UpdateRecurringOrderScheduleSchema,
  CreateRecurringOrderSkipSchema,
  calculateRecurringHarvestDates,
  getNextRecurringDate,
  getShortDayName,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

const recurringOrdersRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // RECURRING ORDER SCHEDULES
  // ============================================================================

  // List all recurring order schedules
  fastify.get('/farms/:farmId/recurring-schedules', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const schedules = await fastify.prisma.recurringOrderSchedule.findMany({
        where: { farmId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  avgYieldPerTray: true,
                  daysSoaking: true,
                  daysGermination: true,
                  daysLight: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          skippedDates: {
            where: {
              skipDate: {
                gte: new Date(),
              },
            },
            orderBy: { skipDate: 'asc' },
          },
          _count: {
            select: {
              generatedOrders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Add computed fields for each schedule
      const schedulesWithNextDate = schedules.map((schedule) => {
        const nextDate = getNextRecurringDate(
          {
            scheduleType: schedule.scheduleType as 'FIXED_DAY' | 'INTERVAL',
            daysOfWeek: schedule.daysOfWeek,
            intervalDays: schedule.intervalDays ?? undefined,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            leadTimeDays: schedule.leadTimeDays,
          },
          schedule.skippedDates.map((s) => s.skipDate)
        );

        // Format schedule description
        let scheduleDescription = '';
        if (schedule.scheduleType === 'FIXED_DAY') {
          const dayNames = schedule.daysOfWeek.map(getShortDayName).join(', ');
          scheduleDescription = `Every ${dayNames}`;
        } else {
          scheduleDescription = `Every ${schedule.intervalDays} days`;
        }

        return {
          ...schedule,
          nextHarvestDate: nextDate,
          scheduleDescription,
        };
      });

      return {
        success: true,
        data: schedulesWithNextDate,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single recurring schedule with full details
  fastify.get('/farms/:farmId/recurring-schedules/:scheduleId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId } = request.params as { farmId: string; scheduleId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  avgYieldPerTray: true,
                  daysSoaking: true,
                  daysGermination: true,
                  daysLight: true,
                },
              },
            },
          },
          customer: true,
          skippedDates: {
            orderBy: { skipDate: 'asc' },
          },
          generatedOrders: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              scheduledHarvestDate: true,
              createdAt: true,
            },
          },
        },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      // Calculate upcoming harvest dates
      const upcomingDates = calculateRecurringHarvestDates(
        {
          scheduleType: schedule.scheduleType as 'FIXED_DAY' | 'INTERVAL',
          daysOfWeek: schedule.daysOfWeek,
          intervalDays: schedule.intervalDays ?? undefined,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          leadTimeDays: schedule.leadTimeDays,
        },
        schedule.skippedDates.map((s) => s.skipDate)
      );

      return {
        success: true,
        data: {
          ...schedule,
          upcomingHarvestDates: upcomingDates,
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create recurring order schedule
  fastify.post('/farms/:farmId/recurring-schedules', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateRecurringOrderScheduleSchema.parse(request.body);

      // Validate that all products exist and have required fields
      for (const item of data.items) {
        const product = await fastify.prisma.product.findUnique({
          where: { id: item.productId, farmId },
        });

        if (!product) {
          throw new BadRequestError(`Product not found: ${item.productId}`);
        }

        if (product.daysGermination == null || product.daysLight == null || product.avgYieldPerTray == null) {
          throw new BadRequestError(
            `Product "${product.name}" is missing required production data (germination days, light days, yield per tray)`
          );
        }
      }

      // Validate customer if provided
      if (data.customerId) {
        const customer = await fastify.prisma.customer.findUnique({
          where: { id: data.customerId, farmId },
        });
        if (!customer) {
          throw new BadRequestError('Customer not found');
        }
      }

      const schedule = await fastify.prisma.recurringOrderSchedule.create({
        data: {
          farmId,
          name: data.name,
          customerId: data.customerId || null,
          scheduleType: data.scheduleType,
          daysOfWeek: data.daysOfWeek || [],
          intervalDays: data.intervalDays || null,
          startDate: data.startDate,
          endDate: data.endDate || null,
          leadTimeDays: data.leadTimeDays,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantityOz: item.quantityOz,
              overagePercent: item.overagePercent,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          customer: true,
        },
      });

      return reply.status(201).send({
        success: true,
        data: schedule,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update recurring order schedule
  fastify.patch('/farms/:farmId/recurring-schedules/:scheduleId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId } = request.params as { farmId: string; scheduleId: string };
      const data = UpdateRecurringOrderScheduleSchema.parse(request.body);

      // Check schedule exists
      const existing = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
      });

      if (!existing) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      const schedule = await fastify.prisma.recurringOrderSchedule.update({
        where: { id: scheduleId, farmId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.customerId !== undefined && { customerId: data.customerId }),
          ...(data.scheduleType && { scheduleType: data.scheduleType }),
          ...(data.daysOfWeek && { daysOfWeek: data.daysOfWeek }),
          ...(data.intervalDays !== undefined && { intervalDays: data.intervalDays }),
          ...(data.startDate && { startDate: data.startDate }),
          ...(data.endDate !== undefined && { endDate: data.endDate }),
          ...(data.leadTimeDays && { leadTimeDays: data.leadTimeDays }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
      });

      return {
        success: true,
        data: schedule,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete recurring order schedule
  fastify.delete('/farms/:farmId/recurring-schedules/:scheduleId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId } = request.params as { farmId: string; scheduleId: string };

      // Check if schedule has generated orders
      const orderCount = await fastify.prisma.order.count({
        where: { recurringScheduleId: scheduleId },
      });

      if (orderCount > 0) {
        // Instead of deleting, deactivate
        await fastify.prisma.recurringOrderSchedule.update({
          where: { id: scheduleId, farmId },
          data: { isActive: false },
        });

        return {
          success: true,
          data: { deactivated: true, message: 'Schedule deactivated (has generated orders)' },
        };
      }

      await fastify.prisma.recurringOrderSchedule.delete({
        where: { id: scheduleId, farmId },
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
  // SKIP DATES
  // ============================================================================

  // Add skip date
  fastify.post('/farms/:farmId/recurring-schedules/:scheduleId/skip', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId } = request.params as { farmId: string; scheduleId: string };
      const data = CreateRecurringOrderSkipSchema.parse(request.body);

      // Verify schedule exists
      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      // Check if already skipped
      const existing = await fastify.prisma.recurringOrderSkip.findFirst({
        where: {
          scheduleId,
          skipDate: data.skipDate,
        },
      });

      if (existing) {
        throw new BadRequestError('This date is already marked as skipped');
      }

      const skip = await fastify.prisma.recurringOrderSkip.create({
        data: {
          scheduleId,
          skipDate: data.skipDate,
          reason: data.reason || null,
        },
      });

      return reply.status(201).send({
        success: true,
        data: skip,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Remove skip date
  fastify.delete('/farms/:farmId/recurring-schedules/:scheduleId/skip/:skipId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId, skipId } = request.params as {
        farmId: string;
        scheduleId: string;
        skipId: string;
      };

      // Verify schedule exists and belongs to farm
      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      await fastify.prisma.recurringOrderSkip.delete({
        where: { id: skipId, scheduleId },
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
  // MANUAL ORDER GENERATION
  // ============================================================================

  // Manually trigger order generation for a schedule
  fastify.post('/farms/:farmId/recurring-schedules/:scheduleId/generate', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId } = request.params as { farmId: string; scheduleId: string };
      const { harvestDate } = request.body as { harvestDate?: string };

      // Get schedule with items
      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      if (!schedule.isActive) {
        throw new BadRequestError('Cannot generate orders for inactive schedule');
      }

      // Use provided harvest date or calculate next one
      let targetHarvestDate: Date;
      if (harvestDate) {
        targetHarvestDate = new Date(harvestDate);
      } else {
        const skips = await fastify.prisma.recurringOrderSkip.findMany({
          where: { scheduleId },
          select: { skipDate: true },
        });

        const nextDate = getNextRecurringDate(
          {
            scheduleType: schedule.scheduleType as 'FIXED_DAY' | 'INTERVAL',
            daysOfWeek: schedule.daysOfWeek,
            intervalDays: schedule.intervalDays ?? undefined,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            leadTimeDays: schedule.leadTimeDays,
          },
          skips.map((s) => s.skipDate)
        );

        if (!nextDate) {
          throw new BadRequestError('No upcoming dates available for this schedule');
        }

        targetHarvestDate = nextDate;
      }

      // Check if order already exists for this date
      const existingOrder = await fastify.prisma.order.findFirst({
        where: {
          recurringScheduleId: scheduleId,
          scheduledHarvestDate: targetHarvestDate,
        },
      });

      if (existingOrder) {
        throw new BadRequestError(
          `Order already exists for this date: ${existingOrder.orderNumber}`
        );
      }

      // Import order creation logic (we'll need to extract this to a service)
      const { calculateProductionSchedule, generateOrderNumber } = await import('@farm/shared');

      // Generate order number
      const count = await fastify.prisma.order.count({ where: { farmId } });
      const orderNumber = generateOrderNumber(count + 1);

      // Create the order in a transaction
      const order = await fastify.prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            farmId,
            orderNumber,
            customerName: schedule.customer?.name || null,
            customerId: schedule.customerId,
            recurringScheduleId: scheduleId,
            isAutoGenerated: false, // Manual trigger
            scheduledHarvestDate: targetHarvestDate,
            notes: `Generated from recurring schedule: ${schedule.name}`,
          },
        });

        // Create items with calculated dates and tasks
        for (const item of schedule.items) {
          const product = item.product;

          const scheduleCalc = calculateProductionSchedule({
            quantityOz: item.quantityOz,
            avgYieldPerTray: product.avgYieldPerTray || 8,
            overagePercent: item.overagePercent,
            harvestDate: targetHarvestDate,
            daysSoaking: product.daysSoaking,
            daysGermination: product.daysGermination || 0,
            daysLight: product.daysLight || 0,
          });

          const orderItem = await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantityOz: item.quantityOz,
              harvestDate: targetHarvestDate,
              overagePercent: item.overagePercent,
              traysNeeded: scheduleCalc.traysNeeded,
              soakDate: scheduleCalc.soakDate,
              seedDate: scheduleCalc.seedDate,
              moveToLightDate: scheduleCalc.moveToLightDate,
            },
          });

          // Create tasks
          const tasks: Array<{
            title: string;
            type: 'SOAK' | 'SEED' | 'MOVE_TO_LIGHT' | 'HARVESTING';
            dueDate: Date;
            description: string;
          }> = [];

          if (scheduleCalc.requiresSoaking) {
            tasks.push({
              title: `SOAK: ${product.name}`,
              type: 'SOAK',
              dueDate: scheduleCalc.soakDate,
              description: `Soak ${scheduleCalc.traysNeeded} trays of ${product.name} seeds`,
            });
          }

          tasks.push(
            {
              title: `SEED: ${product.name}`,
              type: 'SEED',
              dueDate: scheduleCalc.seedDate,
              description: `Plant ${scheduleCalc.traysNeeded} trays of ${product.name}`,
            },
            {
              title: `MOVE TO LIGHT: ${product.name}`,
              type: 'MOVE_TO_LIGHT',
              dueDate: scheduleCalc.moveToLightDate,
              description: `Move ${scheduleCalc.traysNeeded} trays of ${product.name} to grow lights`,
            },
            {
              title: `HARVEST: ${product.name}`,
              type: 'HARVESTING',
              dueDate: scheduleCalc.harvestDate,
              description: `Harvest ${item.quantityOz}oz of ${product.name} (${scheduleCalc.traysNeeded} trays)`,
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

  // ============================================================================
  // RECURRING ORDER ITEMS MANAGEMENT
  // ============================================================================

  // Add item to recurring schedule
  fastify.post('/farms/:farmId/recurring-schedules/:scheduleId/items', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId } = request.params as { farmId: string; scheduleId: string };
      const { productId, quantityOz, overagePercent } = request.body as {
        productId: string;
        quantityOz: number;
        overagePercent?: number;
      };

      // Verify schedule exists
      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      // Validate product
      const product = await fastify.prisma.product.findUnique({
        where: { id: productId, farmId },
      });

      if (!product) {
        throw new BadRequestError('Product not found');
      }

      // Check if product already in schedule
      const existing = await fastify.prisma.recurringOrderItem.findFirst({
        where: { scheduleId, productId },
      });

      if (existing) {
        throw new BadRequestError('Product already exists in this schedule');
      }

      const item = await fastify.prisma.recurringOrderItem.create({
        data: {
          scheduleId,
          productId,
          quantityOz,
          overagePercent: overagePercent ?? 10,
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: item,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update item in recurring schedule
  fastify.patch('/farms/:farmId/recurring-schedules/:scheduleId/items/:itemId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId, itemId } = request.params as {
        farmId: string;
        scheduleId: string;
        itemId: string;
      };
      const { quantityOz, overagePercent } = request.body as {
        quantityOz?: number;
        overagePercent?: number;
      };

      // Verify schedule exists
      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      const item = await fastify.prisma.recurringOrderItem.update({
        where: { id: itemId, scheduleId },
        data: {
          ...(quantityOz !== undefined && { quantityOz }),
          ...(overagePercent !== undefined && { overagePercent }),
        },
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      });

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Remove item from recurring schedule
  fastify.delete('/farms/:farmId/recurring-schedules/:scheduleId/items/:itemId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, scheduleId, itemId } = request.params as {
        farmId: string;
        scheduleId: string;
        itemId: string;
      };

      // Verify schedule exists
      const schedule = await fastify.prisma.recurringOrderSchedule.findUnique({
        where: { id: scheduleId, farmId },
        include: { items: true },
      });

      if (!schedule) {
        throw new NotFoundError('Recurring schedule', scheduleId);
      }

      // Must have at least 1 item
      if (schedule.items.length <= 1) {
        throw new BadRequestError('Schedule must have at least 1 item');
      }

      await fastify.prisma.recurringOrderItem.delete({
        where: { id: itemId, scheduleId },
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

export default recurringOrdersRoutes;
