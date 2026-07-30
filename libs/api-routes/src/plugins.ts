import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError, UnauthorizedError } from '@sf/api-domain';
import type { ApiContext } from './context';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export const authPlugin = fp(async (app, context: ApiContext) => {
  app.decorateRequest('userId', undefined);

  app.addHook('preHandler', async (request) => {
    if (request.method === 'OPTIONS') {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authHeader.replace('Bearer ', '');
    const userId = await context.authService.getUserIdFromBearerToken(token);

    if (!userId) {
      throw new UnauthorizedError();
    }

    request.userId = userId;
  });
});

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return reply.status(400).send({ error: message });
  });
});

export function requireUserId(request: FastifyRequest): string {
  if (!request.userId) {
    throw new UnauthorizedError();
  }

  return request.userId;
}

export function sendError(reply: FastifyReply, message: string, statusCode = 400) {
  return reply.status(statusCode).send({ error: message });
}
