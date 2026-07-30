import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import {
  createDocumentSchema,
  createRuleSchema,
  deleteRuleSchema,
  generateQuizSchema,
  parseRequest,
  updateRuleSchema,
} from '@sf/shared-types';
import type { ApiContext } from './context';
import { authPlugin, errorHandlerPlugin, requireUserId, sendError } from './plugins';

const CORS_ALLOWED_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
] as const;

function registerMethodNotAllowed(app: FastifyInstance, path: string) {
  app.route({
    method: ['GET', 'PUT', 'PATCH', 'DELETE'],
    url: path,
    handler: async (_request, reply) => sendError(reply, 'Method not allowed', 405),
  });
}

function registerOptions(app: FastifyInstance, path: string) {
  app.route({
    method: 'OPTIONS',
    url: path,
    handler: async (_request, reply) =>
      reply
        .status(204)
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        .header('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS.join(', '))
        .header('Access-Control-Max-Age', '86400')
        .send(),
  });
}

export async function registerRoutes(app: FastifyInstance, context: ApiContext) {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    preflight: false,
  });

  await app.register(errorHandlerPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  const compatibilityPaths = [
    '/functions/v1/create-document',
    '/functions/v1/generate-quiz',
    '/functions/v1/create-rule',
    '/functions/v1/update-rule',
    '/functions/v1/delete-rule',
  ] as const;

  for (const path of compatibilityPaths) {
    registerOptions(app, path);
    registerMethodNotAllowed(app, path);
  }

  await app.register(async (protectedApp) => {
    await protectedApp.register(authPlugin, context);

    protectedApp.post('/functions/v1/create-document', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(createDocumentSchema, request.body);
      const document = await context.createDocumentUseCase.execute({
        userId,
        title: body.title,
        text: body.text,
        ruleIds: body.ruleIds,
      });

      return reply.status(201).send({ document });
    });

    protectedApp.post('/functions/v1/generate-quiz', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(generateQuizSchema, request.body);
      const quiz = await context.generateQuizUseCase.execute({
        userId,
        documentId: body.documentId,
        title: body.title,
        questionCount: body.questionCount,
      });

      return reply.status(201).send({ quiz });
    });

    protectedApp.post('/functions/v1/create-rule', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(createRuleSchema, request.body);
      const rule = await context.createRuleUseCase.execute({
        userId,
        name: body.name,
        description: body.description,
        content: body.content,
        isDefault: body.isDefault,
      });

      return reply.status(201).send({ rule });
    });

    protectedApp.post('/functions/v1/update-rule', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(updateRuleSchema, request.body);
      const rule = await context.updateRuleUseCase.execute({
        userId,
        ruleId: body.ruleId,
        name: body.name,
        description: body.description,
        content: body.content,
        isDefault: body.isDefault,
      });

      return reply.send({ rule });
    });

    protectedApp.post('/functions/v1/delete-rule', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(deleteRuleSchema, request.body);
      const result = await context.deleteRuleUseCase.execute({
        userId,
        ruleId: body.ruleId,
      });

      return reply.send(result);
    });
  });
}

export async function createApiServer(context: ApiContext) {
  const fastify = (await import('fastify')).default({
    logger: true,
  });

  await registerRoutes(fastify, context);
  return fastify;
}
