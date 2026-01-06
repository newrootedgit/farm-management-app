import { FastifyPluginAsync } from 'fastify';
import {
  CreateWikiSpaceSchema,
  UpdateWikiSpaceSchema,
  CreateWikiPageSchema,
  UpdateWikiPageSchema,
  CreateWikiTagSchema,
} from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError } from '../../lib/errors.js';

// Helper to get user ID
function getUserId(request: any): string {
  return request.userId || 'demo-user-1';
}

const wikiRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // WIKI SPACES
  // ============================================================================

  // List wiki spaces
  fastify.get('/farms/:farmId/wiki/spaces', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const spaces = await fastify.prisma.wikiSpace.findMany({
        where: { farmId },
        include: {
          _count: {
            select: { pages: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: spaces,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single wiki space
  fastify.get('/farms/:farmId/wiki/spaces/:spaceId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, spaceId } = request.params as { farmId: string; spaceId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const space = await fastify.prisma.wikiSpace.findUnique({
        where: { id: spaceId, farmId },
        include: {
          pages: {
            where: { parentId: null },
            include: {
              children: true,
            },
            orderBy: { title: 'asc' },
          },
          _count: {
            select: { pages: true },
          },
        },
      });

      if (!space) {
        throw new NotFoundError('WikiSpace', spaceId);
      }

      return {
        success: true,
        data: space,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create wiki space
  fastify.post('/farms/:farmId/wiki/spaces', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateWikiSpaceSchema.parse(request.body);

      const space = await fastify.prisma.wikiSpace.create({
        data: {
          ...data,
          farmId,
        },
        include: {
          _count: {
            select: { pages: true },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: space,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update wiki space
  fastify.patch('/farms/:farmId/wiki/spaces/:spaceId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, spaceId } = request.params as { farmId: string; spaceId: string };
      const data = UpdateWikiSpaceSchema.parse(request.body);

      const space = await fastify.prisma.wikiSpace.update({
        where: { id: spaceId, farmId },
        data,
        include: {
          _count: {
            select: { pages: true },
          },
        },
      });

      return {
        success: true,
        data: space,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete wiki space
  fastify.delete('/farms/:farmId/wiki/spaces/:spaceId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, spaceId } = request.params as { farmId: string; spaceId: string };

      await fastify.prisma.wikiSpace.delete({
        where: { id: spaceId, farmId },
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
  // WIKI PAGES
  // ============================================================================

  // List pages in a space
  fastify.get('/farms/:farmId/wiki/spaces/:spaceId/pages', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, spaceId } = request.params as { farmId: string; spaceId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Verify space exists and belongs to farm
      const space = await fastify.prisma.wikiSpace.findUnique({
        where: { id: spaceId, farmId },
      });

      if (!space) {
        throw new NotFoundError('WikiSpace', spaceId);
      }

      const pages = await fastify.prisma.wikiPage.findMany({
        where: { spaceId },
        include: {
          tags: true,
          children: {
            select: { id: true, title: true, slug: true },
          },
        },
        orderBy: { title: 'asc' },
      });

      return {
        success: true,
        data: pages,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single wiki page
  fastify.get('/farms/:farmId/wiki/pages/:pageId', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, pageId } = request.params as { farmId: string; pageId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const page = await fastify.prisma.wikiPage.findUnique({
        where: { id: pageId },
        include: {
          space: true,
          tags: true,
          parent: {
            select: { id: true, title: true, slug: true },
          },
          children: {
            select: { id: true, title: true, slug: true },
          },
        },
      });

      if (!page || page.space.farmId !== farmId) {
        throw new NotFoundError('WikiPage', pageId);
      }

      return {
        success: true,
        data: page,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create wiki page
  fastify.post('/farms/:farmId/wiki/spaces/:spaceId/pages', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, spaceId } = request.params as { farmId: string; spaceId: string };
      const data = CreateWikiPageSchema.parse(request.body);
      const userId = getUserId(request);

      // Verify space exists and belongs to farm
      const space = await fastify.prisma.wikiSpace.findUnique({
        where: { id: spaceId, farmId },
      });

      if (!space) {
        throw new NotFoundError('WikiSpace', spaceId);
      }

      const page = await fastify.prisma.wikiPage.create({
        data: {
          ...data,
          spaceId,
          author: userId,
          content: data.content || { type: 'doc', content: [] },
        },
        include: {
          space: true,
          tags: true,
        },
      });

      return reply.status(201).send({
        success: true,
        data: page,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update wiki page
  fastify.patch('/farms/:farmId/wiki/pages/:pageId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, pageId } = request.params as { farmId: string; pageId: string };
      const data = UpdateWikiPageSchema.parse(request.body);
      const userId = getUserId(request);

      // Verify page exists and belongs to farm
      const existingPage = await fastify.prisma.wikiPage.findUnique({
        where: { id: pageId },
        include: { space: true },
      });

      if (!existingPage || existingPage.space.farmId !== farmId) {
        throw new NotFoundError('WikiPage', pageId);
      }

      // Create revision if content is being updated
      if (data.content) {
        await fastify.prisma.wikiRevision.create({
          data: {
            pageId,
            content: existingPage.content as object,
            author: userId,
            comment: 'Auto-saved revision',
          },
        });
      }

      const page = await fastify.prisma.wikiPage.update({
        where: { id: pageId },
        data,
        include: {
          space: true,
          tags: true,
        },
      });

      return {
        success: true,
        data: page,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete wiki page
  fastify.delete('/farms/:farmId/wiki/pages/:pageId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, pageId } = request.params as { farmId: string; pageId: string };

      // Verify page exists and belongs to farm
      const page = await fastify.prisma.wikiPage.findUnique({
        where: { id: pageId },
        include: { space: true },
      });

      if (!page || page.space.farmId !== farmId) {
        throw new NotFoundError('WikiPage', pageId);
      }

      await fastify.prisma.wikiPage.delete({
        where: { id: pageId },
      });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get page revisions
  fastify.get('/farms/:farmId/wiki/pages/:pageId/revisions', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, pageId } = request.params as { farmId: string; pageId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Verify page exists and belongs to farm
      const page = await fastify.prisma.wikiPage.findUnique({
        where: { id: pageId },
        include: { space: true },
      });

      if (!page || page.space.farmId !== farmId) {
        throw new NotFoundError('WikiPage', pageId);
      }

      const revisions = await fastify.prisma.wikiRevision.findMany({
        where: { pageId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return {
        success: true,
        data: revisions,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // WIKI SEARCH
  // ============================================================================

  // Search wiki pages
  fastify.get('/farms/:farmId/wiki/search', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { q, spaceId } = request.query as { q?: string; spaceId?: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      if (!q || q.trim().length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Get all spaces for this farm
      const farmSpaces = await fastify.prisma.wikiSpace.findMany({
        where: { farmId },
        select: { id: true },
      });
      const spaceIds = farmSpaces.map(s => s.id);

      const pages = await fastify.prisma.wikiPage.findMany({
        where: {
          spaceId: spaceId ? spaceId : { in: spaceIds },
          OR: [
            { title: { contains: q } },
            // Note: SQLite doesn't support JSON path queries, so we search title only
          ],
        },
        include: {
          space: {
            select: { id: true, name: true, slug: true },
          },
          tags: true,
        },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      });

      return {
        success: true,
        data: pages,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // WIKI TAGS
  // ============================================================================

  // List wiki tags
  fastify.get('/farms/:farmId/wiki/tags', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };

      if (!request.farmId) {
        throw new ForbiddenError('Access denied');
      }

      const tags = await fastify.prisma.wikiTag.findMany({
        where: { farmId },
        include: {
          _count: {
            select: { pages: true },
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

  // Create wiki tag
  fastify.post('/farms/:farmId/wiki/tags', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const data = CreateWikiTagSchema.parse(request.body);

      const tag = await fastify.prisma.wikiTag.create({
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

  // Delete wiki tag
  fastify.delete('/farms/:farmId/wiki/tags/:tagId', {
    preHandler: [requireAuth(), requireRole('ADMIN')],
  }, async (request, reply) => {
    try {
      const { farmId, tagId } = request.params as { farmId: string; tagId: string };

      await fastify.prisma.wikiTag.delete({
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

export default wikiRoutes;
