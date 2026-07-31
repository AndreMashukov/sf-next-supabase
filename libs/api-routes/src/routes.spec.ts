import type { ApiContext } from './context';
import { createApiServer } from './routes';
import { describe, expect, it, vi } from 'vitest';

function createMockContext(overrides: Partial<ApiContext> = {}): ApiContext {
  return {
    authService: {
      getUserIdFromBearerToken: vi.fn().mockResolvedValue('user-1'),
    },
    createDocumentUseCase: {
      start: vi.fn().mockResolvedValue({
        id: 'job-1',
        userId: 'user-1',
        kind: 'document',
        status: 'pending',
        input: { title: 'Title', text: 'Prompt' },
        result: {},
        errorMessage: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
        expiresAt: null,
      }),
    },
    generateQuizUseCase: { start: vi.fn() },
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
        color: '#8b5cf6',
        icon: 'Folder',
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
    deleteDocumentsUseCase: {
      execute: vi.fn().mockResolvedValue({
        success: true,
        deletedDocuments: 1,
      }),
    },
    deleteQuizzesUseCase: {
      execute: vi.fn().mockResolvedValue({
        success: true,
        deletedQuizzes: 1,
      }),
    },
    moveDocumentUseCase: { execute: vi.fn() },
    attachRuleToDirectoryUseCase: { execute: vi.fn().mockResolvedValue({ success: true }) },
    detachRuleFromDirectoryUseCase: { execute: vi.fn().mockResolvedValue({ success: true }) },
    updateDocumentUseCase: { execute: vi.fn() },
    updateQuizUseCase: { execute: vi.fn() },
    directoryAgentUseCase: {
      execute: vi.fn().mockResolvedValue({
        reply: 'Done',
        threadId: 'thread-1',
        executedActions: [],
        proposedDeletes: [],
      }),
    },
    knowledgeIndexer: {
      indexDirectory: vi.fn(),
      indexDocument: vi.fn(),
      indexQuiz: vi.fn(),
    },
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

  it('creates a document generation job for authenticated requests', async () => {
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

    expect(response.statusCode).toBe(202);
    expect(response.json().job.id).toBe('job-1');
    expect(context.createDocumentUseCase.start).toHaveBeenCalledWith({
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
      color: '#8b5cf6',
      icon: 'Folder',
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

  it('deletes documents for authenticated requests', async () => {
    const context = createMockContext();
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/delete-documents',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: {
        documentIds: ['33333333-3333-4333-8333-333333333333'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      deletedDocuments: 1,
    });
    expect(context.deleteDocumentsUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      documentIds: ['33333333-3333-4333-8333-333333333333'],
    });
    await app.close();
  });

  it('deletes quizzes for authenticated requests', async () => {
    const context = createMockContext();
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/delete-quizzes',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: {
        quizIds: ['44444444-4444-4444-8444-444444444444'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      deletedQuizzes: 1,
    });
    expect(context.deleteQuizzesUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      quizIds: ['44444444-4444-4444-8444-444444444444'],
    });
    await app.close();
  });

  it('handles agent messages for authenticated requests', async () => {
    const context = createMockContext();
    const app = await createApiServer(context);
    const response = await app.inject({
      method: 'POST',
      url: '/functions/v1/agent-message',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: {
        directoryId: '11111111-1111-4111-8111-111111111111',
        message: 'Summarize this folder',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      reply: 'Done',
      threadId: 'thread-1',
      executedActions: [],
      proposedDeletes: [],
    });
    expect(context.directoryAgentUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      directoryId: '11111111-1111-4111-8111-111111111111',
      message: 'Summarize this folder',
      threadId: undefined,
    });
    await app.close();
  });
});
