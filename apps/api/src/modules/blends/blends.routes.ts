import { FastifyPluginAsync } from 'fastify';
import {
  CreateBlendSchema,
  UpdateBlendSchema,
  calculateBlendProductionSchedule,
  getBlendMaxGrowthDays,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

const blendsRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // BLENDS (Mix Products)
  // ============================================================================

  // List all blends
  fastify.get('/farms/:farmId/blends', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const blends = await fastify.prisma.blend.findMany({
        where: { farmId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          ingredients: {
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
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Add computed fields
      const blendsWithMetadata = blends.map((blend) => {
        const maxGrowthDays = getBlendMaxGrowthDays(
          blend.ingredients.map((ing) => ({
            productId: ing.productId,
            productName: ing.product.name,
            ratioPercent: ing.ratioPercent,
            avgYieldPerTray: ing.product.avgYieldPerTray || 8,
            daysSoaking: ing.overrideDaysSoaking ?? ing.product.daysSoaking,
            daysGermination: ing.overrideDaysGermination ?? ing.product.daysGermination ?? 0,
            daysLight: ing.overrideDaysLight ?? ing.product.daysLight ?? 0,
          }))
        );

        const ingredientNames = blend.ingredients
          .map((ing) => `${ing.product.name} (${ing.ratioPercent}%)`)
          .join(', ');

        return {
          ...blend,
          maxGrowthDays,
          ingredientSummary: ingredientNames,
          ingredientCount: blend.ingredients.length,
        };
      });

      return {
        success: true,
        data: blendsWithMetadata,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single blend with full details
  fastify.get('/farms/:farmId/blends/:blendId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, blendId } = request.params as { farmId: string; blendId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const blend = await fastify.prisma.blend.findUnique({
        where: { id: blendId, farmId },
        include: {
          product: true,
          ingredients: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  avgYieldPerTray: true,
                  daysSoaking: true,
                  daysGermination: true,
                  daysLight: true,
                },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!blend) {
        throw new NotFoundError('Blend', blendId);
      }

      return {
        success: true,
        data: blend,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create blend (also creates associated product)
  fastify.post('/farms/:farmId/blends', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateBlendSchema.parse(request.body);

      // Validate all ingredient products exist and have required fields
      const ingredientProducts = await Promise.all(
        data.ingredients.map(async (ing) => {
          const product = await fastify.prisma.product.findUnique({
            where: { id: ing.productId, farmId },
          });

          if (!product) {
            throw new BadRequestError(`Ingredient product not found: ${ing.productId}`);
          }

          if (product.isBlend) {
            throw new BadRequestError(`Cannot use blend "${product.name}" as an ingredient`);
          }

          if (product.daysGermination == null || product.daysLight == null) {
            throw new BadRequestError(
              `Product "${product.name}" is missing required production data`
            );
          }

          return { ...ing, product };
        })
      );

      // Check for duplicate blend name
      const existingBlend = await fastify.prisma.blend.findFirst({
        where: { farmId, name: data.name },
      });

      if (existingBlend) {
        throw new BadRequestError(`A blend named "${data.name}" already exists`);
      }

      // Calculate the max growth days for the blend product
      const maxGrowthDays = getBlendMaxGrowthDays(
        ingredientProducts.map((ing) => ({
          productId: ing.productId,
          productName: ing.product.name,
          ratioPercent: ing.ratioPercent,
          avgYieldPerTray: ing.product.avgYieldPerTray || 8,
          daysSoaking: ing.overrideDaysSoaking ?? ing.product.daysSoaking,
          daysGermination: ing.overrideDaysGermination ?? ing.product.daysGermination ?? 0,
          daysLight: ing.overrideDaysLight ?? ing.product.daysLight ?? 0,
        }))
      );

      // Create blend in transaction (creates product + blend + ingredients)
      const blend = await fastify.prisma.$transaction(async (tx) => {
        // Create the product for this blend
        const blendProduct = await tx.product.create({
          data: {
            farmId,
            name: data.name,
            isBlend: true,
            // Use the slowest ingredient's timing for the blend product
            daysGermination: maxGrowthDays,
            daysLight: 0,
            daysSoaking: null,
            // Average yield will be calculated based on ingredient ratios
            avgYieldPerTray: ingredientProducts.reduce((sum, ing) => {
              return sum + (ing.product.avgYieldPerTray || 8) * (ing.ratioPercent / 100);
            }, 0),
          },
        });

        // Create the blend
        const newBlend = await tx.blend.create({
          data: {
            farmId,
            name: data.name,
            description: data.description || null,
            productId: blendProduct.id,
            ingredients: {
              create: data.ingredients.map((ing, index) => ({
                productId: ing.productId,
                ratioPercent: ing.ratioPercent,
                overrideDaysSoaking: ing.overrideDaysSoaking ?? null,
                overrideDaysGermination: ing.overrideDaysGermination ?? null,
                overrideDaysLight: ing.overrideDaysLight ?? null,
                displayOrder: index,
              })),
            },
          },
          include: {
            product: true,
            ingredients: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        });

        return newBlend;
      });

      return reply.status(201).send({
        success: true,
        data: blend,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update blend
  fastify.patch('/farms/:farmId/blends/:blendId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, blendId } = request.params as { farmId: string; blendId: string };
      const data = UpdateBlendSchema.parse(request.body);

      // Get existing blend
      const existing = await fastify.prisma.blend.findUnique({
        where: { id: blendId, farmId },
        include: { product: true },
      });

      if (!existing) {
        throw new NotFoundError('Blend', blendId);
      }

      // If updating ingredients, validate them
      if (data.ingredients) {
        for (const ing of data.ingredients) {
          const product = await fastify.prisma.product.findUnique({
            where: { id: ing.productId, farmId },
          });

          if (!product) {
            throw new BadRequestError(`Ingredient product not found: ${ing.productId}`);
          }

          if (product.isBlend) {
            throw new BadRequestError(`Cannot use blend "${product.name}" as an ingredient`);
          }
        }
      }

      // Update blend in transaction
      const blend = await fastify.prisma.$transaction(async (tx) => {
        // Update product name if blend name changed
        if (data.name) {
          await tx.product.update({
            where: { id: existing.productId },
            data: { name: data.name },
          });
        }

        // If ingredients are being updated, replace them all
        if (data.ingredients) {
          // Delete existing ingredients
          await tx.blendIngredient.deleteMany({
            where: { blendId },
          });

          // Create new ingredients
          await tx.blendIngredient.createMany({
            data: data.ingredients.map((ing, index) => ({
              blendId,
              productId: ing.productId,
              ratioPercent: ing.ratioPercent,
              overrideDaysSoaking: ing.overrideDaysSoaking ?? null,
              overrideDaysGermination: ing.overrideDaysGermination ?? null,
              overrideDaysLight: ing.overrideDaysLight ?? null,
              displayOrder: index,
            })),
          });
        }

        // Update blend
        return tx.blend.update({
          where: { id: blendId, farmId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
          include: {
            product: true,
            ingredients: {
              include: {
                product: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        });
      });

      return {
        success: true,
        data: blend,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete blend
  fastify.delete('/farms/:farmId/blends/:blendId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, blendId } = request.params as { farmId: string; blendId: string };

      const blend = await fastify.prisma.blend.findUnique({
        where: { id: blendId, farmId },
        include: { product: true },
      });

      if (!blend) {
        throw new NotFoundError('Blend', blendId);
      }

      // Check if blend's product is used in any orders
      const orderItemCount = await fastify.prisma.orderItem.count({
        where: { productId: blend.productId },
      });

      if (orderItemCount > 0) {
        // Deactivate instead of delete
        await fastify.prisma.blend.update({
          where: { id: blendId },
          data: { isActive: false },
        });

        return {
          success: true,
          data: { deactivated: true, message: 'Blend deactivated (used in orders)' },
        };
      }

      // Delete blend and associated product
      await fastify.prisma.$transaction([
        fastify.prisma.blend.delete({
          where: { id: blendId },
        }),
        fastify.prisma.product.delete({
          where: { id: blend.productId },
        }),
      ]);

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // BLEND PRODUCTION PREVIEW
  // ============================================================================

  // Preview blend production schedule (without creating an order)
  fastify.post('/farms/:farmId/blends/:blendId/preview-schedule', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, blendId } = request.params as { farmId: string; blendId: string };
      const { quantityOz, harvestDate, overagePercent } = request.body as {
        quantityOz: number;
        harvestDate: string;
        overagePercent?: number;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const blend = await fastify.prisma.blend.findUnique({
        where: { id: blendId, farmId },
        include: {
          ingredients: {
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
        },
      });

      if (!blend) {
        throw new NotFoundError('Blend', blendId);
      }

      const schedule = calculateBlendProductionSchedule({
        quantityOz,
        overagePercent: overagePercent ?? 10,
        harvestDate: new Date(harvestDate),
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

      return {
        success: true,
        data: schedule,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // BLEND ORDER INSTANCE TRACKING
  // ============================================================================

  // Get blend instance for an order item
  fastify.get('/farms/:farmId/blend-instances/:instanceId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, instanceId } = request.params as { farmId: string; instanceId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const instance = await fastify.prisma.blendOrderInstance.findUnique({
        where: { id: instanceId },
        include: {
          blend: {
            select: {
              id: true,
              name: true,
            },
          },
          orderItem: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  farmId: true,
                },
              },
            },
          },
          ingredientYields: {
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

      if (!instance || instance.orderItem.order.farmId !== farmId) {
        throw new NotFoundError('Blend instance', instanceId);
      }

      return {
        success: true,
        data: instance,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Record yield for a blend ingredient
  fastify.post('/farms/:farmId/blend-instances/:instanceId/yields', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, instanceId } = request.params as { farmId: string; instanceId: string };
      const { productId, actualYieldOz, traysUsed, harvestedBy, notes } = request.body as {
        productId: string;
        actualYieldOz: number;
        traysUsed?: number;
        harvestedBy: string;
        notes?: string;
      };

      // Get instance and verify farm
      const instance = await fastify.prisma.blendOrderInstance.findUnique({
        where: { id: instanceId },
        include: {
          orderItem: {
            include: { order: true },
          },
        },
      });

      if (!instance || instance.orderItem.order.farmId !== farmId) {
        throw new NotFoundError('Blend instance', instanceId);
      }

      // Check if yield already recorded for this ingredient
      const existing = await fastify.prisma.blendIngredientYield.findFirst({
        where: {
          blendInstanceId: instanceId,
          productId,
        },
      });

      if (existing) {
        // Update existing yield
        const updated = await fastify.prisma.blendIngredientYield.update({
          where: { id: existing.id },
          data: {
            actualYieldOz,
            traysUsed: traysUsed || null,
            harvestedBy,
            harvestedAt: new Date(),
            notes: notes || null,
          },
        });

        return {
          success: true,
          data: updated,
        };
      }

      // Get target oz from instance's ingredientTargets
      const targets = instance.ingredientTargets as Array<{ productId: string; targetOz: number }>;
      const target = targets.find((t) => t.productId === productId);

      if (!target) {
        throw new BadRequestError('Product not found in blend ingredients');
      }

      const yieldRecord = await fastify.prisma.blendIngredientYield.create({
        data: {
          blendInstanceId: instanceId,
          productId,
          targetOz: target.targetOz,
          actualYieldOz,
          traysUsed: traysUsed || null,
          harvestedBy,
          harvestedAt: new Date(),
          notes: notes || null,
        },
      });

      return reply.status(201).send({
        success: true,
        data: yieldRecord,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default blendsRoutes;
