import { FastifyInstance } from 'fastify';
import {
  CreateSupplyCategorySchema,
  UpdateSupplyCategorySchema,
  CreateSupplySchema,
  UpdateSupplySchema,
  CreateSupplyPurchaseSchema,
  UpdateSupplyPurchaseSchema,
  CreateSupplyUsageSchema,
  InventoryCheckSchema,
} from '@farm/shared';

export default async function suppliesRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // ============================================================================
  // SUPPLY CATEGORIES
  // ============================================================================

  // Get all supply categories for a farm
  fastify.get<{ Params: { farmId: string } }>(
    '/farms/:farmId/supply-categories',
    async (request, reply) => {
      const { farmId } = request.params;

      const categories = await prisma.supplyCategory.findMany({
        where: { farmId },
        include: {
          _count: { select: { supplies: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return categories;
    }
  );

  // Create a supply category
  fastify.post<{ Params: { farmId: string }; Body: unknown }>(
    '/farms/:farmId/supply-categories',
    async (request, reply) => {
      const { farmId } = request.params;
      const parseResult = CreateSupplyCategorySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Check for duplicate name
      const existing = await prisma.supplyCategory.findFirst({
        where: { farmId, name: data.name },
      });

      if (existing) {
        return reply.status(400).send({ error: 'A category with this name already exists' });
      }

      const category = await prisma.supplyCategory.create({
        data: {
          farmId,
          name: data.name,
          sortOrder: data.sortOrder ?? 0,
        },
      });

      return reply.status(201).send(category);
    }
  );

  // Update a supply category
  fastify.patch<{ Params: { farmId: string; id: string }; Body: unknown }>(
    '/farms/:farmId/supply-categories/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;
      const parseResult = UpdateSupplyCategorySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      const existing = await prisma.supplyCategory.findFirst({
        where: { id, farmId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Category not found' });
      }

      // Check for duplicate name (if changing)
      if (data.name && data.name !== existing.name) {
        const duplicate = await prisma.supplyCategory.findFirst({
          where: { farmId, name: data.name, NOT: { id } },
        });

        if (duplicate) {
          return reply.status(400).send({ error: 'A category with this name already exists' });
        }
      }

      const category = await prisma.supplyCategory.update({
        where: { id },
        data: {
          name: data.name,
          sortOrder: data.sortOrder,
        },
      });

      return category;
    }
  );

  // Delete a supply category
  fastify.delete<{ Params: { farmId: string; id: string } }>(
    '/farms/:farmId/supply-categories/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;

      const existing = await prisma.supplyCategory.findFirst({
        where: { id, farmId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Category not found' });
      }

      // Check if any supplies are using this category
      const suppliesCount = await prisma.supply.count({
        where: { categoryId: id },
      });

      if (suppliesCount > 0) {
        return reply.status(400).send({
          error: `Cannot delete: ${suppliesCount} supplies are using this category`,
        });
      }

      await prisma.supplyCategory.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // Seed default categories
  fastify.post<{ Params: { farmId: string } }>(
    '/farms/:farmId/supply-categories/seed-defaults',
    async (request, reply) => {
      const { farmId } = request.params;

      const defaults = [
        { name: 'Seeds', sortOrder: 1 },
        { name: 'Grow Media', sortOrder: 2 },
        { name: 'Packaging', sortOrder: 3 },
        { name: 'Other', sortOrder: 99 },
      ];

      const created = [];

      for (const def of defaults) {
        const existing = await prisma.supplyCategory.findFirst({
          where: { farmId, name: def.name },
        });

        if (!existing) {
          const category = await prisma.supplyCategory.create({
            data: {
              farmId,
              name: def.name,
              sortOrder: def.sortOrder,
            },
          });
          created.push(category);
        }
      }

      return { created, message: `Created ${created.length} default categories` };
    }
  );

  // ============================================================================
  // SUPPLIES
  // ============================================================================

  // Get all supplies for a farm
  fastify.get<{ Params: { farmId: string }; Querystring: { categoryId?: string } }>(
    '/farms/:farmId/supplies',
    async (request, reply) => {
      const { farmId } = request.params;
      const { categoryId } = request.query;

      const supplies = await prisma.supply.findMany({
        where: {
          farmId,
          ...(categoryId && { categoryId }),
        },
        include: {
          category: true,
          product: {
            select: { id: true, name: true },
          },
          _count: { select: { purchases: true, usageLogs: true } },
        },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      });

      return supplies;
    }
  );

  // Get a single supply
  fastify.get<{ Params: { farmId: string; id: string } }>(
    '/farms/:farmId/supplies/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;

      const supply = await prisma.supply.findFirst({
        where: { id, farmId },
        include: {
          category: true,
          product: {
            select: { id: true, name: true },
          },
        },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      return supply;
    }
  );

  // Create a supply
  fastify.post<{ Params: { farmId: string }; Body: unknown }>(
    '/farms/:farmId/supplies',
    async (request, reply) => {
      const { farmId } = request.params;
      const parseResult = CreateSupplySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Check for duplicate name
      const existing = await prisma.supply.findFirst({
        where: { farmId, name: data.name },
      });

      if (existing) {
        return reply.status(400).send({ error: 'A supply with this name already exists' });
      }

      // Verify category exists
      const category = await prisma.supplyCategory.findFirst({
        where: { id: data.categoryId, farmId },
      });

      if (!category) {
        return reply.status(400).send({ error: 'Category not found' });
      }

      // Verify product exists if provided
      if (data.productId) {
        const product = await prisma.product.findFirst({
          where: { id: data.productId, farmId },
        });

        if (!product) {
          return reply.status(400).send({ error: 'Product (variety) not found' });
        }
      }

      const supply = await prisma.supply.create({
        data: {
          farmId,
          categoryId: data.categoryId,
          name: data.name,
          sku: data.sku,
          productId: data.productId,
          unit: data.unit,
          isActive: data.isActive ?? true,
        },
        include: {
          category: true,
          product: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.status(201).send(supply);
    }
  );

  // Update a supply
  fastify.patch<{ Params: { farmId: string; id: string }; Body: unknown }>(
    '/farms/:farmId/supplies/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;
      const parseResult = UpdateSupplySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      const existing = await prisma.supply.findFirst({
        where: { id, farmId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      // Check for duplicate name (if changing)
      if (data.name && data.name !== existing.name) {
        const duplicate = await prisma.supply.findFirst({
          where: { farmId, name: data.name, NOT: { id } },
        });

        if (duplicate) {
          return reply.status(400).send({ error: 'A supply with this name already exists' });
        }
      }

      // Verify category exists if changing
      if (data.categoryId && data.categoryId !== existing.categoryId) {
        const category = await prisma.supplyCategory.findFirst({
          where: { id: data.categoryId, farmId },
        });

        if (!category) {
          return reply.status(400).send({ error: 'Category not found' });
        }
      }

      // Verify product exists if changing
      if (data.productId !== undefined && data.productId !== existing.productId) {
        if (data.productId) {
          const product = await prisma.product.findFirst({
            where: { id: data.productId, farmId },
          });

          if (!product) {
            return reply.status(400).send({ error: 'Product (variety) not found' });
          }
        }
      }

      const supply = await prisma.supply.update({
        where: { id },
        data: {
          categoryId: data.categoryId,
          name: data.name,
          sku: data.sku,
          productId: data.productId,
          unit: data.unit,
          isActive: data.isActive,
        },
        include: {
          category: true,
          product: {
            select: { id: true, name: true },
          },
        },
      });

      return supply;
    }
  );

  // Delete a supply
  fastify.delete<{ Params: { farmId: string; id: string } }>(
    '/farms/:farmId/supplies/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;

      const existing = await prisma.supply.findFirst({
        where: { id, farmId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      await prisma.supply.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // ============================================================================
  // SUPPLY PURCHASES
  // ============================================================================

  // Get ALL purchases for a farm (with optional filters)
  fastify.get<{
    Params: { farmId: string };
    Querystring: { supplyId?: string; categoryId?: string; supplier?: string };
  }>(
    '/farms/:farmId/purchases',
    async (request, reply) => {
      const { farmId } = request.params;
      const { supplyId, categoryId, supplier } = request.query;

      const purchases = await prisma.supplyPurchase.findMany({
        where: {
          supply: {
            farmId,
            ...(supplyId && { id: supplyId }),
            ...(categoryId && { categoryId }),
          },
          ...(supplier && { supplier }),
        },
        include: {
          supply: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { purchaseDate: 'desc' },
      });

      return purchases;
    }
  );

  // Get purchases for a specific supply
  fastify.get<{ Params: { farmId: string; supplyId: string } }>(
    '/farms/:farmId/supplies/:supplyId/purchases',
    async (request, reply) => {
      const { farmId, supplyId } = request.params;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      const purchases = await prisma.supplyPurchase.findMany({
        where: { supplyId },
        orderBy: { purchaseDate: 'desc' },
      });

      return purchases;
    }
  );

  // Create a purchase (receive stock)
  fastify.post<{ Params: { farmId: string; supplyId: string }; Body: unknown }>(
    '/farms/:farmId/supplies/:supplyId/purchases',
    async (request, reply) => {
      const { farmId, supplyId } = request.params;
      const parseResult = CreateSupplyPurchaseSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      // Calculate total cost
      const totalCost = Math.round(data.quantity * data.unitCost);

      // Create purchase record and update inventory in a transaction
      const [purchase, updatedSupply] = await prisma.$transaction([
        prisma.supplyPurchase.create({
          data: {
            supplyId,
            quantity: data.quantity,
            unit: data.unit,
            unitCost: data.unitCost,
            totalCost,
            supplier: data.supplier,
            lotNumber: data.lotNumber,
            purchaseDate: data.purchaseDate ?? new Date(),
            expiryDate: data.expiryDate,
            notes: data.notes,
            receivedBy: data.receivedBy,
          },
        }),
        // Increment currentStock and set unit if not already set
        prisma.supply.update({
          where: { id: supplyId },
          data: {
            currentStock: { increment: data.quantity },
            // Set unit from purchase if supply doesn't have one yet
            ...(supply.unit === null && { unit: data.unit }),
          },
        }),
      ]);

      console.log(`[Purchase] Supply ${supplyId}: +${data.quantity} ${data.unit}, new stock: ${updatedSupply.currentStock}`);

      return reply.status(201).send(purchase);
    }
  );

  // Update a purchase
  fastify.patch<{ Params: { farmId: string; supplyId: string; id: string }; Body: unknown }>(
    '/farms/:farmId/supplies/:supplyId/purchases/:id',
    async (request, reply) => {
      const { farmId, supplyId, id } = request.params;
      const parseResult = UpdateSupplyPurchaseSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      const existing = await prisma.supplyPurchase.findFirst({
        where: { id, supplyId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Purchase not found' });
      }

      // Calculate new total cost if quantity or unitCost changed
      const newQuantity = data.quantity ?? Number(existing.quantity);
      const newUnitCost = data.unitCost ?? existing.unitCost;
      const totalCost = Math.round(newQuantity * newUnitCost);

      const purchase = await prisma.supplyPurchase.update({
        where: { id },
        data: {
          quantity: data.quantity,
          unit: data.unit,
          unitCost: data.unitCost,
          totalCost,
          supplier: data.supplier,
          lotNumber: data.lotNumber,
          purchaseDate: data.purchaseDate,
          expiryDate: data.expiryDate,
          notes: data.notes,
          receivedBy: data.receivedBy,
        },
      });

      return purchase;
    }
  );

  // Delete a purchase
  fastify.delete<{ Params: { farmId: string; supplyId: string; id: string } }>(
    '/farms/:farmId/supplies/:supplyId/purchases/:id',
    async (request, reply) => {
      const { farmId, supplyId, id } = request.params;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      const existing = await prisma.supplyPurchase.findFirst({
        where: { id, supplyId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Purchase not found' });
      }

      // Delete purchase and decrement inventory in a transaction
      await prisma.$transaction([
        prisma.supplyPurchase.delete({
          where: { id },
        }),
        // Decrement currentStock by the purchase quantity
        prisma.supply.update({
          where: { id: supplyId },
          data: {
            currentStock: { decrement: Number(existing.quantity) },
          },
        }),
      ]);

      return { success: true };
    }
  );

  // ============================================================================
  // SUPPLY USAGE
  // ============================================================================

  // Get usage logs for a supply
  fastify.get<{ Params: { farmId: string; supplyId: string } }>(
    '/farms/:farmId/supplies/:supplyId/usage',
    async (request, reply) => {
      const { farmId, supplyId } = request.params;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      const usage = await prisma.supplyUsage.findMany({
        where: { supplyId },
        orderBy: { usageDate: 'desc' },
      });

      return usage;
    }
  );

  // Create a usage record (manual adjustment)
  fastify.post<{ Params: { farmId: string; supplyId: string }; Body: unknown }>(
    '/farms/:farmId/supplies/:supplyId/usage',
    async (request, reply) => {
      const { farmId, supplyId } = request.params;
      const parseResult = CreateSupplyUsageSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      // Create usage record and decrement inventory in a transaction
      const [usage] = await prisma.$transaction([
        prisma.supplyUsage.create({
          data: {
            supplyId,
            quantity: data.quantity,
            usageType: data.usageType,
            taskId: data.taskId,
            orderItemId: data.orderItemId,
            lotNumber: data.lotNumber,
            notes: data.notes,
            recordedBy: data.recordedBy,
            usageDate: data.usageDate ?? new Date(),
          },
        }),
        // Decrement currentStock by the usage amount
        prisma.supply.update({
          where: { id: supplyId },
          data: {
            currentStock: { decrement: data.quantity },
          },
        }),
      ]);

      return reply.status(201).send(usage);
    }
  );

  // ============================================================================
  // INVENTORY CHECK
  // ============================================================================

  // Perform an inventory check (manual count that sets absolute value)
  fastify.post<{ Params: { farmId: string; supplyId: string }; Body: unknown }>(
    '/farms/:farmId/supplies/:supplyId/inventory-check',
    async (request, reply) => {
      const { farmId, supplyId } = request.params;
      const parseResult = InventoryCheckSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      // Calculate the difference between actual count and current stock
      const currentStock = Number(supply.currentStock);
      const difference = data.actualQuantity - currentStock;

      // Create usage record for audit trail and update stock in a transaction
      const [usage, updatedSupply] = await prisma.$transaction([
        prisma.supplyUsage.create({
          data: {
            supplyId,
            quantity: Math.abs(difference), // Store absolute difference
            usageType: 'INVENTORY_CHECK',
            notes: `Inventory check: ${currentStock} -> ${data.actualQuantity}${difference !== 0 ? ` (${difference > 0 ? '+' : ''}${difference})` : ''}${data.notes ? `. ${data.notes}` : ''}`,
            usageDate: new Date(),
          },
        }),
        prisma.supply.update({
          where: { id: supplyId },
          data: {
            currentStock: data.actualQuantity,
          },
          include: {
            category: true,
          },
        }),
      ]);

      return reply.status(200).send({
        supply: updatedSupply,
        adjustment: {
          previousStock: currentStock,
          newStock: data.actualQuantity,
          difference,
        },
        usageRecord: usage,
      });
    }
  );

  // Recalculate inventory for all supplies in a farm
  // This fixes stock levels based on actual purchase and usage records
  fastify.post<{ Params: { farmId: string } }>(
    '/farms/:farmId/supplies/recalculate-inventory',
    async (request, reply) => {
      const { farmId } = request.params;

      // Get all supplies for this farm
      const supplies = await prisma.supply.findMany({
        where: { farmId },
        include: {
          purchases: true,
          usageLogs: true,
        },
      });

      const results = [];

      for (const supply of supplies) {
        // Calculate total from purchases
        const totalPurchased = supply.purchases.reduce(
          (sum, p) => sum + Number(p.quantity),
          0
        );

        // Calculate total from usage (excluding INVENTORY_CHECK which sets absolute values)
        const totalUsed = supply.usageLogs
          .filter(u => u.usageType !== 'INVENTORY_CHECK')
          .reduce((sum, u) => sum + Number(u.quantity), 0);

        // Calculate correct stock
        const correctStock = totalPurchased - totalUsed;

        // Determine unit from most recent purchase if supply doesn't have one
        const latestPurchase = supply.purchases.sort(
          (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        )[0];
        const unit = supply.unit || latestPurchase?.unit || null;

        // Update the supply
        await prisma.supply.update({
          where: { id: supply.id },
          data: {
            currentStock: correctStock,
            unit,
          },
        });

        results.push({
          id: supply.id,
          name: supply.name,
          previousStock: Number(supply.currentStock),
          newStock: correctStock,
          totalPurchased,
          totalUsed,
          unit,
        });
      }

      console.log(`[Recalculate] Fixed inventory for ${results.length} supplies in farm ${farmId}`);

      return reply.status(200).send({
        message: `Recalculated inventory for ${results.length} supplies`,
        results,
      });
    }
  );

  // Get available lot numbers for a supply (purchases with remaining stock)
  fastify.get<{ Params: { farmId: string; supplyId: string } }>(
    '/farms/:farmId/supplies/:supplyId/lots',
    async (request, reply) => {
      const { farmId, supplyId } = request.params;

      // Verify supply exists and belongs to farm
      const supply = await prisma.supply.findFirst({
        where: { id: supplyId, farmId },
      });

      if (!supply) {
        return reply.status(404).send({ error: 'Supply not found' });
      }

      // Get purchases with lot numbers, ordered by date (FIFO)
      const purchases = await prisma.supplyPurchase.findMany({
        where: {
          supplyId,
          lotNumber: { not: null },
        },
        orderBy: { purchaseDate: 'asc' },
        select: {
          id: true,
          lotNumber: true,
          quantity: true,
          purchaseDate: true,
          expiryDate: true,
          supplier: true,
        },
      });

      return purchases;
    }
  );
}
