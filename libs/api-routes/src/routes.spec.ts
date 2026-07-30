import type { ApiContext } from './context';
import { createApiServer } from './routes';
import { describe, expect, it, vi } from 'vitest';

function createMockContext(overrides: Partial<ApiContext> = {}): ApiContext {
  return {
    authService: {
      getUserIdFromBearerToken: vi.fn().mockResolvedValue('user-1'),
    },
    createDocumentUseCase: {
      execute: vi.fn().mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        title: 'Title',
        description: 'Prompt',
        wordCount: 10,
        storagePath: 'users/user-1/documents/doc-1/content.html',
        appliedRuleIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    },
    generateQuizUseCase: { execute: vi.fn() },
    createRuleUseCase: { execute: vi.fn() },
    updateRuleUseCase: { execute: vi.fn() },
    deleteRuleUseCase: { execute: vi.fn() },
    ...overrides,
  } as ApiContext;
}

describe('createApiServer', () => {
  it('returns health status without auth', async () => {
    const app = await createApiServer(createMockContext());
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('rejects unauthenticated create-document requests', async () => {
    const app = await createApiServer(createMockContext());
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/create-document',
      payload: { title: 'Title', text: 'Prompt' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized' });
    await app.close();
  });

  it('handles OPTIONS preflight for compatibility routes', async () => {
    const app = await createApiServer(createMockContext());
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/functions/v1/create-document',
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-headers']).toContain('authorization');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    await app.close();
  });

  it('returns 405 for unsupported methods', async () => {
    const app = await createApiServer(createMockContext());
    const response = await app.inject({
      method: 'GET',
      url: '/functions/v1/create-document',
    });

    expect(response.statusCode).toBe(405);
    expect(response.json()).toEqual({ error: 'Method not allowed' });
    await app.close();
  });

  it('creates a document for authenticated requests', async () => {
    const context = createMockContext();
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/create-document',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: { title: 'Title', text: 'Prompt', ruleIds: [] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().document.id).toBe('doc-1');
    expect(context.createDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Title',
      text: 'Prompt',
      ruleIds: [],
    });
    await app.close();
  });
});
