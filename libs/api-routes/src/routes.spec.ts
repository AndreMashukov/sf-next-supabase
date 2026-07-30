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
        directoryId: null,
        appliedRuleIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    },
    generateQuizUseCase: { execute: vi.fn() },
    createRuleUseCase: { execute: vi.fn() },
    updateRuleUseCase: { execute: vi.fn() },
    deleteRuleUseCase: { execute: vi.fn() },
    createDirectoryUseCase: {
      execute: vi.fn().mockResolvedValue({
        id: 'dir-1',
        userId: 'user-1',
        parentId: null,
        name: 'Folder',
        description: '',
        path: '/Folder',
        level: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    },
    updateDirectoryUseCase: { execute: vi.fn() },
    moveDirectoryUseCase: { execute: vi.fn() },
    deleteDirectoryUseCase: {
      execute: vi.fn().mockResolvedValue({
        success: true,
        deletedDirectories: 1,
        deletedDocuments: 0,
      }),
    },
    moveDocumentUseCase: { execute: vi.fn() },
    attachRuleToDirectoryUseCase: { execute: vi.fn().mockResolvedValue({ success: true }) },
    detachRuleFromDirectoryUseCase: { execute: vi.fn().mockResolvedValue({ success: true }) },
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
      payload: {
        title: 'Title',
        text: 'Prompt',
        ruleIds: [],
        directoryId: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().document.id).toBe('doc-1');
    expect(context.createDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Title',
      text: 'Prompt',
      ruleIds: [],
      directoryId: '11111111-1111-4111-8111-111111111111',
    });
    await app.close();
  });

  it('creates a directory for authenticated requests', async () => {
    const context = createMockContext();
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/create-directory',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: { name: 'Folder' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().directory.id).toBe('dir-1');
    expect(context.createDirectoryUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Folder',
      parentId: undefined,
      description: '',
    });
    await app.close();
  });

  it('deletes a directory for authenticated requests', async () => {
    const context = createMockContext();
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/delete-directory',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: { directoryId: '11111111-1111-4111-8111-111111111111' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      deletedDirectories: 1,
      deletedDocuments: 0,
    });
    await app.close();
  });

  it('rejects create-document requests without a folder', async () => {
    const app = await createApiServer(createMockContext());
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/create-document',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: { title: 'Title', text: 'Prompt', ruleIds: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain('folder');
    await app.close();
  });

  it('moves a directory for authenticated requests', async () => {
    const context = createMockContext({
      moveDirectoryUseCase: {
        execute: vi.fn().mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          userId: 'user-1',
          parentId: '22222222-2222-4222-8222-222222222222',
          name: 'Folder',
          description: '',
          path: '/Parent/Folder',
          level: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      },
    });
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/move-directory',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: {
        directoryId: '11111111-1111-4111-8111-111111111111',
        parentId: '22222222-2222-4222-8222-222222222222',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(context.moveDirectoryUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      directoryId: '11111111-1111-4111-8111-111111111111',
      parentId: '22222222-2222-4222-8222-222222222222',
    });
    await app.close();
  });

  it('moves a document for authenticated requests', async () => {
    const context = createMockContext({
      moveDocumentUseCase: {
        execute: vi.fn().mockResolvedValue({
          id: 'doc-1',
          userId: 'user-1',
          title: 'Title',
          description: 'Prompt',
          wordCount: 10,
          storagePath: 'users/user-1/documents/doc-1/content.html',
          directoryId: '11111111-1111-4111-8111-111111111111',
          appliedRuleIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      },
    });
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/move-document',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: {
        documentId: '33333333-3333-4333-8333-333333333333',
        directoryId: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(context.moveDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      documentId: '33333333-3333-4333-8333-333333333333',
      directoryId: '11111111-1111-4111-8111-111111111111',
    });
    await app.close();
  });
});
