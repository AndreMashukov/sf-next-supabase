import cors from '@fastify/cors';
import fastifySse from '@fastify/sse';
import type { FastifyInstance } from 'fastify';
import {
  createDocumentSchema,
  deleteDirectorySchema,
  deleteDocumentsSchema,
  deleteQuizzesSchema,
  generateQuizSchema,
  agentMessageSchema,
  parseRequest,
  updateDocumentSchema,
  updateQuizSchema,
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

  await app.register(fastifySse);

  await app.register(errorHandlerPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  const apiPaths = [
    '/api/v1/create-document',
    '/api/v1/generate-quiz',
    '/api/v1/delete-directory',
    '/api/v1/delete-documents',
    '/api/v1/delete-quizzes',
    '/api/v1/agent-message',
    '/api/v1/agent-message-stream',
    '/api/v1/update-document',
    '/api/v1/update-quiz',
  ] as const;

  for (const path of apiPaths) {
    registerOptions(app, path);
    registerMethodNotAllowed(app, path);
  }

  await app.register(async (protectedApp) => {
    await protectedApp.register(authPlugin, context);

    protectedApp.post('/api/v1/create-document', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(createDocumentSchema, request.body);
      const job = await context.createDocumentUseCase.start({
        userId,
        title: body.title,
        text: body.text,
        ruleIds: body.ruleIds,
        directoryId: body.directoryId,
      });

      return reply.status(202).send({ job });
    });

    protectedApp.post('/api/v1/generate-quiz', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(generateQuizSchema, request.body);
      const job = await context.generateQuizUseCase.start({
        userId,
        documentId: body.documentId,
        title: body.title,
        questionCount: body.questionCount,
      });

      return reply.status(202).send({ job });
    });

    protectedApp.post('/api/v1/delete-directory', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(deleteDirectorySchema, request.body);
      const result = await context.deleteDirectoryUseCase.execute({
        userId,
        directoryId: body.directoryId,
      });

      return reply.send(result);
    });

    protectedApp.post('/api/v1/delete-documents', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(deleteDocumentsSchema, request.body);
      const result = await context.deleteDocumentsUseCase.execute({
        userId,
        documentIds: body.documentIds,
      });

      return reply.send(result);
    });

    protectedApp.post('/api/v1/delete-quizzes', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(deleteQuizzesSchema, request.body);
      const result = await context.deleteQuizzesUseCase.execute({
        userId,
        quizIds: body.quizIds,
      });

      return reply.send(result);
    });

    protectedApp.post('/api/v1/agent-message', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(agentMessageSchema, request.body);
      const result = await context.directoryAgentUseCase.execute({
        userId,
        scope: body.scope,
        directoryId: body.directoryId,
        message: body.message,
        threadId: body.threadId,
      });

      return reply.send(result);
    });

    protectedApp.post('/api/v1/agent-message-stream', { sse: 'manual' }, async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(agentMessageSchema, request.body);

      if (!reply.sse) {
        return sendError(reply, 'Streaming is unavailable', 500);
      }

      try {
        for await (const event of context.directoryAgentUseCase.stream({
          userId,
          scope: body.scope,
          directoryId: body.directoryId,
          message: body.message,
          threadId: body.threadId,
        })) {
          if (!reply.sse.isConnected) {
            break;
          }

          await reply.sse.send({
            event: event.type,
            data: event,
          });
        }
      } catch (error) {
        if (reply.sse.isConnected) {
          await reply.sse.send({
            event: 'error',
            data: {
              type: 'error',
              message: error instanceof Error ? error.message : 'Agent stream failed',
            },
          });
        }
        throw error;
      }
    });

    protectedApp.post('/api/v1/update-document', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(updateDocumentSchema, request.body);
      const document = await context.updateDocumentUseCase.execute({
        userId,
        documentId: body.documentId,
        title: body.title,
        description: body.description,
        html: body.html,
      });

      return reply.send({ document });
    });

    protectedApp.post('/api/v1/update-quiz', async (request, reply) => {
      const userId = requireUserId(request);
      const body = parseRequest(updateQuizSchema, request.body);
      const quiz = await context.updateQuizUseCase.execute({
        userId,
        quizId: body.quizId,
        title: body.title,
        questions: body.questions,
      });

      return reply.send({ quiz });
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
