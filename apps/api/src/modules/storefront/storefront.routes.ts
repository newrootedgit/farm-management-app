import { FastifyPluginAsync } from 'fastify';
import { StorefrontOrderSchema } from '@farm/shared';

const storefrontRoutes: FastifyPluginAsync = async (fastify) => {
  // Get storefront data (public - no auth)
  fastify.get('/storefront/:farmSlug', async (request, reply) => {
    try {
      const { farmSlug } = request.params as { farmSlug: string };

      // Find farm by slug (using findFirst since slug is part of compound unique)
      const farm = await fastify.prisma.farm.findFirst({
        where: { slug: farmSlug },
        select: {
          id: true,
          name: true,
          slug: true,
          timezone: true,
          currency: true,
          logoUrl: true,
        },
      });

      if (!farm) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Farm not found' },
        });
      }

      // Get product categories
      const categories = await fastify.prisma.productCategory.findMany({
        where: { farmId: farm.id },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      // Get products with public SKUs only
      const products = await fastify.prisma.product.findMany({
        where: {
          farmId: farm.id,
          skus: {
            some: {
              isPublic: true,
              isAvailable: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          skus: {
            where: {
              isPublic: true,
              isAvailable: true,
            },
            select: {
              id: true,
              skuCode: true,
              name: true,
              weightOz: true,
              price: true,
              isAvailable: true,
              displayOrder: true,
              imageUrl: true,
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: {
          farm,
          products,
          categories,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront data' },
      });
    }
  });

  // Submit order (public - no auth)
  fastify.post('/storefront/:farmSlug/orders', async (request, reply) => {
    try {
      const { farmSlug } = request.params as { farmSlug: string };
      const orderData = StorefrontOrderSchema.parse(request.body);

      // Find farm by slug
      const farm = await fastify.prisma.farm.findFirst({
        where: { slug: farmSlug },
      });

      if (!farm) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Farm not found' },
        });
      }

      // Validate all SKUs exist and are available
      const skuIds = orderData.items.map((item) => item.skuId);
      const skus = await fastify.prisma.sku.findMany({
        where: {
          id: { in: skuIds },
          isPublic: true,
          isAvailable: true,
          product: { farmId: farm.id },
        },
        include: { product: true },
      });

      if (skus.length !== skuIds.length) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_SKU', message: 'One or more items are unavailable' },
        });
      }

      // Build SKU lookup
      const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

      // Parse delivery date
      const deliveryDate = new Date(orderData.deliveryDate);

      // Calculate totals and build order items
      let totalCents = 0;
      let totalOz = 0;
      const orderItems = orderData.items.map((item) => {
        const sku = skuMap.get(item.skuId)!;
        const product = sku.product;
        const lineTotalCents = sku.price * item.quantity;
        const itemOz = sku.weightOz * item.quantity;
        totalCents += lineTotalCents;
        totalOz += itemOz;

        // Calculate production dates based on product settings
        const daysToGrow =
          (product.daysSoaking ?? 0) +
          (product.daysGermination ?? 0) +
          (product.daysLight ?? 0);

        const harvestDate = new Date(deliveryDate);

        // Calculate soak date (working backwards from harvest)
        const soakDate = new Date(harvestDate);
        soakDate.setDate(soakDate.getDate() - daysToGrow);

        // Seed date (after soaking)
        const seedDate = new Date(soakDate);
        seedDate.setDate(seedDate.getDate() + (product.daysSoaking ?? 0));

        // Move to light date
        const moveToLightDate = new Date(seedDate);
        moveToLightDate.setDate(moveToLightDate.getDate() + (product.daysGermination ?? 0));

        // Calculate trays needed
        const avgYield = product.avgYieldPerTray ?? 8; // Default 8oz per tray
        const overagePercent = 10;
        const traysNeeded = Math.ceil((itemOz * (1 + overagePercent / 100)) / avgYield);

        return {
          productId: sku.productId,
          skuId: sku.id,
          quantity: item.quantity,
          quantityOz: itemOz,
          unitPriceCents: sku.price,
          lineTotalCents,
          harvestDate,
          soakDate,
          seedDate,
          moveToLightDate,
          traysNeeded,
          overagePercent,
        };
      });

      // Find or create customer
      let customer = orderData.customerEmail
        ? await fastify.prisma.customer.findFirst({
            where: {
              farmId: farm.id,
              email: orderData.customerEmail,
            },
          })
        : null;

      if (!customer) {
        customer = await fastify.prisma.customer.create({
          data: {
            farmId: farm.id,
            name: orderData.customerName,
            email: orderData.customerEmail,
            phone: orderData.customerPhone,
            customerType: 'RETAIL',
            paymentTerms: 'DUE_ON_RECEIPT',
          },
        });
      }

      // Generate order number
      const orderCount = await fastify.prisma.order.count({
        where: { farmId: farm.id },
      });
      const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`;

      // Create the order
      const order = await fastify.prisma.order.create({
        data: {
          farmId: farm.id,
          customerId: customer.id,
          customerName: orderData.customerName,
          orderNumber,
          status: 'PENDING',
          notes: orderData.notes,
          orderSource: 'STOREFRONT',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
              sku: true,
            },
          },
        },
      });

      // TODO: Generate payment link if Stripe is configured
      const paymentLink: string | null = null;
      // For now, we'll skip payment link generation

      // TODO: Send email notification to farm
      // TODO: Send order confirmation email to customer

      return reply.status(201).send({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalCents,
          paymentLink,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid order data', details: error },
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit order' },
      });
    }
  });

  // Check availability for a date (public - no auth)
  fastify.get('/storefront/:farmSlug/availability', async (request, reply) => {
    try {
      const { farmSlug } = request.params as { farmSlug: string };
      const { date } = request.query as { date?: string };

      // Find farm by slug
      const farm = await fastify.prisma.farm.findFirst({
        where: { slug: farmSlug },
      });

      if (!farm) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Farm not found' },
        });
      }

      // For now, just return that the date is available
      // In the future, this could check:
      // - Maximum orders per day
      // - Production capacity
      // - Blackout dates
      // - Lead time requirements

      const isAvailable = true;
      const minLeadDays = 2; // Minimum days in advance for orders

      const requestedDate = date ? new Date(date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const minOrderDate = new Date(today);
      minOrderDate.setDate(minOrderDate.getDate() + minLeadDays);

      if (requestedDate && requestedDate < minOrderDate) {
        return {
          success: true,
          data: {
            available: false,
            reason: `Orders require at least ${minLeadDays} days notice`,
            minOrderDate: minOrderDate.toISOString().split('T')[0],
          },
        };
      }

      return {
        success: true,
        data: {
          available: isAvailable,
          minOrderDate: minOrderDate.toISOString().split('T')[0],
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to check availability' },
      });
    }
  });
};

export default storefrontRoutes;
