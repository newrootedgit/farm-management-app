import { FastifyInstance } from 'fastify';
import { CreatePackageTypeSchema, UpdatePackageTypeSchema } from '@farm/shared';

export default async function packageTypesRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // Get all package types for a farm
  fastify.get<{ Params: { farmId: string } }>(
    '/farms/:farmId/package-types',
    async (request, reply) => {
      const { farmId } = request.params;

      const types = await prisma.packageType.findMany({
        where: { farmId },
        orderBy: { name: 'asc' },
      });

      return types;
    }
  );

  // Get a single package type
  fastify.get<{ Params: { farmId: string; id: string } }>(
    '/farms/:farmId/package-types/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;

      const packageType = await prisma.packageType.findFirst({
        where: { id, farmId },
      });

      if (!packageType) {
        return reply.status(404).send({ error: 'Package type not found' });
      }

      return packageType;
    }
  );

  // Create a new package type
  fastify.post<{ Params: { farmId: string }; Body: unknown }>(
    '/farms/:farmId/package-types',
    async (request, reply) => {
      const { farmId } = request.params;
      const parseResult = CreatePackageTypeSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Check for duplicate name
      const existingName = await prisma.packageType.findFirst({
        where: { farmId, name: data.name },
      });

      if (existingName) {
        return reply.status(400).send({ error: 'A package type with this name already exists' });
      }

      // Check for duplicate code
      const existingCode = await prisma.packageType.findFirst({
        where: { farmId, code: data.code.toUpperCase() },
      });

      if (existingCode) {
        return reply.status(400).send({ error: 'A package type with this code already exists' });
      }

      const packageType = await prisma.packageType.create({
        data: {
          farmId,
          name: data.name,
          code: data.code.toUpperCase(),
          isActive: data.isActive ?? true,
        },
      });

      return reply.status(201).send(packageType);
    }
  );

  // Update a package type
  fastify.patch<{ Params: { farmId: string; id: string }; Body: unknown }>(
    '/farms/:farmId/package-types/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;
      const parseResult = UpdatePackageTypeSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.message });
      }

      const data = parseResult.data;

      // Check if exists
      const existing = await prisma.packageType.findFirst({
        where: { id, farmId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Package type not found' });
      }

      // Check for duplicate name (if changing)
      if (data.name && data.name !== existing.name) {
        const existingName = await prisma.packageType.findFirst({
          where: { farmId, name: data.name, NOT: { id } },
        });

        if (existingName) {
          return reply.status(400).send({ error: 'A package type with this name already exists' });
        }
      }

      // Check for duplicate code (if changing)
      if (data.code && data.code.toUpperCase() !== existing.code) {
        const existingCode = await prisma.packageType.findFirst({
          where: { farmId, code: data.code.toUpperCase(), NOT: { id } },
        });

        if (existingCode) {
          return reply.status(400).send({ error: 'A package type with this code already exists' });
        }
      }

      const packageType = await prisma.packageType.update({
        where: { id },
        data: {
          name: data.name,
          code: data.code?.toUpperCase(),
          isActive: data.isActive,
        },
      });

      return packageType;
    }
  );

  // Delete a package type
  fastify.delete<{ Params: { farmId: string; id: string } }>(
    '/farms/:farmId/package-types/:id',
    async (request, reply) => {
      const { farmId, id } = request.params;

      // Check if exists
      const existing = await prisma.packageType.findFirst({
        where: { id, farmId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Package type not found' });
      }

      // Check if any SKUs are using this package type
      const skusUsingType = await prisma.sku.count({
        where: { packageTypeId: id },
      });

      if (skusUsingType > 0) {
        return reply.status(400).send({
          error: `Cannot delete: ${skusUsingType} SKU(s) are using this package type. Update or remove them first.`,
        });
      }

      await prisma.packageType.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // Seed default package types for a farm
  fastify.post<{ Params: { farmId: string } }>(
    '/farms/:farmId/package-types/seed-defaults',
    async (request, reply) => {
      const { farmId } = request.params;

      const defaults = [
        { name: 'Clamshell', code: 'CL' },
        { name: 'Bag', code: 'BG' },
      ];

      const created = [];

      for (const def of defaults) {
        // Skip if already exists
        const existing = await prisma.packageType.findFirst({
          where: { farmId, OR: [{ name: def.name }, { code: def.code }] },
        });

        if (!existing) {
          const packageType = await prisma.packageType.create({
            data: {
              farmId,
              name: def.name,
              code: def.code,
              isActive: true,
            },
          });
          created.push(packageType);
        }
      }

      return { created, message: `Created ${created.length} default package types` };
    }
  );
}
