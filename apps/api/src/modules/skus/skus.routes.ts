import { FastifyPluginAsync } from 'fastify';
import { pipeline } from 'stream/promises';
import { createWriteStream, unlink } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { CreateSkuSchema, UpdateSkuSchema } from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

const unlinkAsync = promisify(unlink);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', '..', '..', 'uploads');

const skusRoutes: FastifyPluginAsync = async (fastify) => {
  // ====== SKU ROUTES (nested under products) ======

  // List all SKUs for a product
  fastify.get('/farms/:farmId/products/:productId/skus', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, productId } = request.params as { farmId: string; productId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Verify product exists and belongs to farm
      const product = await fastify.prisma.product.findUnique({
        where: { id: productId, farmId },
      });

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      const skus = await fastify.prisma.sku.findMany({
        where: { productId },
        orderBy: { displayOrder: 'asc' },
      });

      return {
        success: true,
        data: skus,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single SKU
  fastify.get('/farms/:farmId/products/:productId/skus/:skuId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, productId, skuId } = request.params as {
        farmId: string;
        productId: string;
        skuId: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const sku = await fastify.prisma.sku.findUnique({
        where: { id: skuId, productId },
        include: { product: true },
      });

      if (!sku || sku.product.farmId !== farmId) {
        throw new NotFoundError('SKU', skuId);
      }

      return {
        success: true,
        data: sku,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create SKU
  fastify.post('/farms/:farmId/products/:productId/skus', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, productId } = request.params as { farmId: string; productId: string };
      const data = CreateSkuSchema.parse(request.body);

      // Verify product exists and belongs to farm
      const product = await fastify.prisma.product.findUnique({
        where: { id: productId, farmId },
      });

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      const sku = await fastify.prisma.sku.create({
        data: {
          ...data,
          productId,
        },
        include: { product: true },
      });

      return reply.status(201).send({
        success: true,
        data: sku,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update SKU
  fastify.patch('/farms/:farmId/products/:productId/skus/:skuId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, productId, skuId } = request.params as {
        farmId: string;
        productId: string;
        skuId: string;
      };
      const data = UpdateSkuSchema.parse(request.body);

      // Verify SKU exists and belongs to the right product/farm
      const existingSku = await fastify.prisma.sku.findUnique({
        where: { id: skuId },
        include: { product: true },
      });

      if (!existingSku || existingSku.productId !== productId || existingSku.product.farmId !== farmId) {
        throw new NotFoundError('SKU', skuId);
      }

      const sku = await fastify.prisma.sku.update({
        where: { id: skuId },
        data,
        include: { product: true },
      });

      return {
        success: true,
        data: sku,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete SKU
  fastify.delete('/farms/:farmId/products/:productId/skus/:skuId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, productId, skuId } = request.params as {
        farmId: string;
        productId: string;
        skuId: string;
      };

      // Verify SKU exists and belongs to the right product/farm
      const existingSku = await fastify.prisma.sku.findUnique({
        where: { id: skuId },
        include: { product: true },
      });

      if (!existingSku || existingSku.productId !== productId || existingSku.product.farmId !== farmId) {
        throw new NotFoundError('SKU', skuId);
      }

      // Check if SKU is used in any orders
      const orderItemCount = await fastify.prisma.orderItem.count({
        where: { skuId },
      });

      if (orderItemCount > 0) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete SKU that is used in orders',
        });
      }

      await fastify.prisma.sku.delete({
        where: { id: skuId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Upload SKU image
  fastify.post('/farms/:farmId/products/:productId/skus/:skuId/image', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, productId, skuId } = request.params as {
        farmId: string;
        productId: string;
        skuId: string;
      };

      // Verify SKU exists and belongs to the right product/farm
      const existingSku = await fastify.prisma.sku.findUnique({
        where: { id: skuId },
        include: { product: true },
      });

      if (!existingSku || existingSku.productId !== productId || existingSku.product.farmId !== farmId) {
        throw new NotFoundError('SKU', skuId);
      }

      const data = await request.file();
      if (!data) {
        throw new BadRequestError('No file uploaded');
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        throw new BadRequestError('Invalid file type. Allowed: PNG, JPG, WEBP');
      }

      // Delete old image if exists
      if (existingSku.imageUrl) {
        const oldFilename = existingSku.imageUrl.replace('/uploads/skus/', '');
        const oldFilepath = join(uploadsDir, 'skus', oldFilename);
        try {
          await unlinkAsync(oldFilepath);
        } catch (err) {
          // File may not exist, ignore
        }
      }

      // Generate filename
      const ext = extname(data.filename) || '.jpg';
      const filename = `${skuId}${ext}`;
      const filepath = join(uploadsDir, 'skus', filename);

      // Save file
      await pipeline(data.file, createWriteStream(filepath));

      // Update SKU with image URL
      const imageUrl = `/uploads/skus/${filename}`;
      const sku = await fastify.prisma.sku.update({
        where: { id: skuId },
        data: { imageUrl },
        include: { product: true },
      });

      return {
        success: true,
        data: { imageUrl: sku.imageUrl },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete SKU image
  fastify.delete('/farms/:farmId/products/:productId/skus/:skuId/image', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, productId, skuId } = request.params as {
        farmId: string;
        productId: string;
        skuId: string;
      };

      // Verify SKU exists and belongs to the right product/farm
      const existingSku = await fastify.prisma.sku.findUnique({
        where: { id: skuId },
        include: { product: true },
      });

      if (!existingSku || existingSku.productId !== productId || existingSku.product.farmId !== farmId) {
        throw new NotFoundError('SKU', skuId);
      }

      if (existingSku.imageUrl) {
        // Delete the file
        const filename = existingSku.imageUrl.replace('/uploads/skus/', '');
        const filepath = join(uploadsDir, 'skus', filename);
        try {
          await unlinkAsync(filepath);
        } catch (err) {
          // File may not exist, ignore
        }
      }

      // Clear image URL in database
      await fastify.prisma.sku.update({
        where: { id: skuId },
        data: { imageUrl: null },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ====== FLAT SKU LIST (all SKUs for a farm) ======

  // List all SKUs for a farm (flat list across all products)
  fastify.get('/farms/:farmId/skus', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { isPublic, isAvailable } = request.query as {
        isPublic?: string;
        isAvailable?: string;
      };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const skus = await fastify.prisma.sku.findMany({
        where: {
          product: { farmId },
          ...(isPublic !== undefined && { isPublic: isPublic === 'true' }),
          ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' }),
        },
        include: {
          product: {
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
            },
          },
        },
        orderBy: [
          { product: { name: 'asc' } },
          { displayOrder: 'asc' },
        ],
      });

      return {
        success: true,
        data: skus,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default skusRoutes;
