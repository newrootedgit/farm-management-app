import { FastifyPluginAsync } from 'fastify';
import { GenerateDocumentSchema, SendDocumentEmailSchema, DocumentType } from '@farm/shared';
import { requireAuth, requireRole } from '../../plugins/tenant.js';
import { handleError, NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';
import { generateDocument, getDocumentFilename } from '../../services/pdf/pdf-generator.js';
import * as fs from 'fs';
import * as path from 'path';

// Directory for storing generated PDFs
const DOCUMENTS_DIR = path.join(process.cwd(), 'generated-documents');

// Ensure documents directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

const documentsRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // DOCUMENT GENERATION
  // ============================================================================

  // Generate a document for an order
  fastify.post('/farms/:farmId/orders/:orderId/documents', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const body = GenerateDocumentSchema.parse(request.body);

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Fetch order with all relations needed for document generation
      const order = await fastify.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          farm: true,
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          deliveryRoute: {
            include: {
              driver: true,
            },
          },
          deliverySignature: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      if (order.farmId !== farmId) {
        throw new ForbiddenError('Order does not belong to this farm');
      }

      // Generate document number
      let documentNumber: string;
      let invoiceDate: Date | undefined;
      let dueDate: Date | undefined;
      let bolNumber: string | undefined;
      let shipDate: Date | undefined;

      switch (body.type) {
        case 'INVOICE':
          // Use existing invoice number or generate new one
          if (order.invoiceNumber) {
            documentNumber = order.invoiceNumber;
          } else {
            const farm = await fastify.prisma.farm.update({
              where: { id: farmId },
              data: { nextInvoiceNumber: { increment: 1 } },
              select: { invoicePrefix: true, nextInvoiceNumber: true },
            });
            documentNumber = `${farm.invoicePrefix}-${String(farm.nextInvoiceNumber - 1).padStart(5, '0')}`;

            // Update order with invoice info
            await fastify.prisma.order.update({
              where: { id: orderId },
              data: {
                invoiceNumber: documentNumber,
                invoicedAt: new Date(),
                invoiceDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
              },
            });
          }
          invoiceDate = order.invoicedAt || new Date();
          dueDate = order.invoiceDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          break;

        case 'PACKING_SLIP':
          documentNumber = `PS-${order.orderNumber}`;
          break;

        case 'DELIVERY_RECEIPT':
          documentNumber = `DR-${order.orderNumber}`;
          break;

        case 'BILL_OF_LADING':
          bolNumber = `BOL-${order.orderNumber}`;
          documentNumber = bolNumber;
          shipDate = order.deliveryDate || new Date();
          break;

        default:
          throw new BadRequestError(`Unsupported document type: ${body.type}`);
      }

      // Generate the PDF
      const pdfBuffer = await generateDocument({
        type: body.type,
        order: order as any,
        invoiceNumber: documentNumber,
        invoiceDate,
        dueDate,
        bolNumber,
        shipDate,
      });

      // Save to file system
      const fileName = getDocumentFilename(body.type, order.orderNumber);
      const filePath = path.join(DOCUMENTS_DIR, farmId, fileName);

      // Ensure farm directory exists
      const farmDir = path.join(DOCUMENTS_DIR, farmId);
      if (!fs.existsSync(farmDir)) {
        fs.mkdirSync(farmDir, { recursive: true });
      }

      fs.writeFileSync(filePath, pdfBuffer);

      // Save document record
      const document = await fastify.prisma.generatedDocument.create({
        data: {
          farmId,
          orderId,
          type: body.type,
          documentNumber,
          fileUrl: `/documents/${farmId}/${fileName}`,
          fileName,
          generatedBy: request.userId || null,
          dueDate: body.type === 'INVOICE' ? dueDate : null,
        },
      });

      // Optionally send email
      if (body.sendEmail && body.emailTo) {
        // Email sending would be implemented here
        // For now, just record that we want to send it
        await fastify.prisma.generatedDocument.update({
          where: { id: document.id },
          data: {
            sentAt: new Date(),
            sentTo: body.emailTo,
          },
        });
      }

      return {
        success: true,
        data: document,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // List documents for an order
  fastify.get('/farms/:farmId/orders/:orderId/documents', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      const documents = await fastify.prisma.generatedDocument.findMany({
        where: {
          farmId,
          orderId,
        },
        orderBy: { generatedAt: 'desc' },
      });

      return {
        success: true,
        data: documents,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // List all documents for a farm
  fastify.get('/farms/:farmId/documents', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId } = request.params as { farmId: string };
      const { type, startDate, endDate, limit = 50, offset = 0 } = request.query as {
        type?: DocumentType;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
      };

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      const documents = await fastify.prisma.generatedDocument.findMany({
        where: {
          farmId,
          ...(type && { type }),
          ...(startDate && { generatedAt: { gte: new Date(startDate) } }),
          ...(endDate && { generatedAt: { lte: new Date(endDate) } }),
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      });

      const total = await fastify.prisma.generatedDocument.count({
        where: {
          farmId,
          ...(type && { type }),
          ...(startDate && { generatedAt: { gte: new Date(startDate) } }),
          ...(endDate && { generatedAt: { lte: new Date(endDate) } }),
        },
      });

      return {
        success: true,
        data: documents,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Download a document
  fastify.get('/farms/:farmId/documents/:documentId/download', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, documentId } = request.params as { farmId: string; documentId: string };

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      const document = await fastify.prisma.generatedDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      if (document.farmId !== farmId) {
        throw new ForbiddenError('Document does not belong to this farm');
      }

      const filePath = path.join(DOCUMENTS_DIR, farmId, document.fileName);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Document file not found');
      }

      const fileBuffer = fs.readFileSync(filePath);

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${document.fileName}"`)
        .send(fileBuffer);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Preview a document (inline display)
  fastify.get('/farms/:farmId/documents/:documentId/preview', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, documentId } = request.params as { farmId: string; documentId: string };

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      const document = await fastify.prisma.generatedDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      if (document.farmId !== farmId) {
        throw new ForbiddenError('Document does not belong to this farm');
      }

      const filePath = path.join(DOCUMENTS_DIR, farmId, document.fileName);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Document file not found');
      }

      const fileBuffer = fs.readFileSync(filePath);

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="${document.fileName}"`)
        .send(fileBuffer);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Send a document via email
  fastify.post('/farms/:farmId/documents/:documentId/send', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, documentId } = request.params as { farmId: string; documentId: string };
      const body = SendDocumentEmailSchema.parse(request.body);

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      const document = await fastify.prisma.generatedDocument.findUnique({
        where: { id: documentId },
        include: {
          order: {
            include: {
              customer: true,
            },
          },
          farm: true,
        },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      if (document.farmId !== farmId) {
        throw new ForbiddenError('Document does not belong to this farm');
      }

      // TODO: Implement actual email sending using a service like SendGrid, Resend, etc.
      // For now, just update the sent status

      const updatedDocument = await fastify.prisma.generatedDocument.update({
        where: { id: documentId },
        data: {
          sentAt: new Date(),
          sentTo: body.emailTo,
        },
      });

      return {
        success: true,
        message: 'Email functionality not yet implemented',
        data: updatedDocument,
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete a document
  fastify.delete('/farms/:farmId/documents/:documentId', {
    preHandler: [requireAuth(), requireRole('FARM_MANAGER')],
  }, async (request, reply) => {
    try {
      const { farmId, documentId } = request.params as { farmId: string; documentId: string };

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      const document = await fastify.prisma.generatedDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      if (document.farmId !== farmId) {
        throw new ForbiddenError('Document does not belong to this farm');
      }

      // Delete the file
      const filePath = path.join(DOCUMENTS_DIR, farmId, document.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete the record
      await fastify.prisma.generatedDocument.delete({
        where: { id: documentId },
      });

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================================================
  // QUICK DOCUMENT GENERATION (regenerate on the fly without saving)
  // ============================================================================

  // Generate and return PDF directly (for preview without saving)
  fastify.post('/farms/:farmId/orders/:orderId/documents/preview', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    try {
      const { farmId, orderId } = request.params as { farmId: string; orderId: string };
      const { type } = request.body as { type: DocumentType };

      if (request.farmId !== farmId) {
        throw new ForbiddenError('Access denied');
      }

      // Fetch order with all relations
      const order = await fastify.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          farm: true,
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          deliveryRoute: {
            include: {
              driver: true,
            },
          },
          deliverySignature: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      if (order.farmId !== farmId) {
        throw new ForbiddenError('Order does not belong to this farm');
      }

      // Generate temporary document numbers for preview
      let documentNumber: string;
      let invoiceDate: Date | undefined;
      let dueDate: Date | undefined;
      let bolNumber: string | undefined;
      let shipDate: Date | undefined;

      switch (type) {
        case 'INVOICE':
          documentNumber = order.invoiceNumber || `${order.farm.invoicePrefix}-PREVIEW`;
          invoiceDate = order.invoicedAt || new Date();
          dueDate = order.invoiceDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'PACKING_SLIP':
          documentNumber = `PS-${order.orderNumber}`;
          break;
        case 'DELIVERY_RECEIPT':
          documentNumber = `DR-${order.orderNumber}`;
          break;
        case 'BILL_OF_LADING':
          bolNumber = `BOL-${order.orderNumber}`;
          documentNumber = bolNumber;
          shipDate = order.deliveryDate || new Date();
          break;
        default:
          throw new BadRequestError(`Unsupported document type: ${type}`);
      }

      // Generate the PDF
      const pdfBuffer = await generateDocument({
        type,
        order: order as any,
        invoiceNumber: documentNumber,
        invoiceDate,
        dueDate,
        bolNumber,
        shipDate,
      });

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="preview-${type.toLowerCase()}-${order.orderNumber}.pdf"`)
        .send(pdfBuffer);
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default documentsRoutes;
