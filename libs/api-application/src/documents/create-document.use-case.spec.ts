import { CreateDocumentUseCase } from './create-document.use-case';
import { describe, expect, it, vi } from 'vitest';

function createGenerationJobRepository() {
  return {
    createPending: vi.fn().mockImplementation(async (input) => ({
      id: 'job-1',
      userId: input.userId,
      kind: input.kind,
      status: 'pending',
      input: input.input,
      result: {},
      errorMessage: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      completedAt: null,
      expiresAt: null,
    })),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(0),
  };
}

describe('CreateDocumentUseCase', () => {
  it('cleans up uploaded storage when database insert fails', async () => {
    const documentRepository = {
      create: vi.fn().mockRejectedValue(new Error('Failed to create document record')),
    };
    const ruleRepository = {
      fetchByIds: vi.fn().mockResolvedValue([]),
    };
    const directoryRepository = {
      listForUser: vi.fn().mockResolvedValue([]),
      listRuleIdsByDirectoryIds: vi.fn().mockResolvedValue(new Map()),
    };
    const storageService = {
      uploadHtml: vi.fn().mockResolvedValue(undefined),
      downloadHtml: vi.fn(),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };
    const documentGenerator = {
      isAgentEnabled: vi.fn().mockReturnValue(true),
      generate: vi.fn().mockResolvedValue('<p>Generated</p>'),
    };
    const generationJobRepository = createGenerationJobRepository();

    const useCase = new CreateDocumentUseCase(
      documentRepository,
      ruleRepository,
      directoryRepository,
      storageService,
      documentGenerator,
      generationJobRepository,
    );

    await useCase.start({
      userId: 'user-1',
      title: 'Title',
      text: 'Prompt',
      ruleIds: [],
    });

    await vi.waitFor(() => {
      expect(generationJobRepository.markFailed).toHaveBeenCalled();
    });

    expect(storageService.uploadHtml).toHaveBeenCalled();
    expect(storageService.deleteObject).toHaveBeenCalled();
  });

  it('applies inherited directory rules before explicit rule ids', async () => {
    const documentRepository = {
      create: vi.fn().mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        title: 'Title',
        description: 'Prompt',
        wordCount: 1,
        storagePath: 'path',
        directoryId: 'dir-child',
        appliedRuleIds: ['rule-parent', 'rule-child', 'rule-explicit'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    };
    const ruleRepository = {
      fetchByIds: vi.fn().mockResolvedValue([
        { name: 'Parent', content: 'Parent rule' },
        { name: 'Child', content: 'Child rule' },
        { name: 'Explicit', content: 'Explicit rule' },
      ]),
    };
    const directoryRepository = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'dir-child',
        userId: 'user-1',
        parentId: 'dir-parent',
        name: 'Child',
        description: '',
        path: '/Parent/Child',
        level: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      listForUser: vi.fn().mockResolvedValue([
        {
          id: 'dir-parent',
          userId: 'user-1',
          parentId: null,
          name: 'Parent',
          description: '',
          path: '/Parent',
          level: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'dir-child',
          userId: 'user-1',
          parentId: 'dir-parent',
          name: 'Child',
          description: '',
          path: '/Parent/Child',
          level: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      listRuleIdsByDirectoryIds: vi.fn().mockResolvedValue(
        new Map([
          ['dir-parent', ['rule-parent']],
          ['dir-child', ['rule-child']],
        ]),
      ),
    };
    const storageService = {
      uploadHtml: vi.fn().mockResolvedValue(undefined),
      downloadHtml: vi.fn(),
      deleteObject: vi.fn(),
    };
    const documentGenerator = {
      isAgentEnabled: vi.fn().mockReturnValue(true),
      generate: vi.fn().mockResolvedValue('<p>Generated</p>'),
    };
    const generationJobRepository = createGenerationJobRepository();

    const useCase = new CreateDocumentUseCase(
      documentRepository,
      ruleRepository,
      directoryRepository,
      storageService,
      documentGenerator,
      generationJobRepository,
    );

    await useCase.start({
      userId: 'user-1',
      title: 'Title',
      text: 'Prompt',
      ruleIds: ['rule-explicit'],
      directoryId: 'dir-child',
    });

    await vi.waitFor(() => {
      expect(generationJobRepository.markCompleted).toHaveBeenCalled();
    });

    expect(ruleRepository.fetchByIds).toHaveBeenCalledWith('user-1', [
      'rule-parent',
      'rule-child',
      'rule-explicit',
    ]);
    expect(documentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        directoryId: 'dir-child',
        appliedRuleIds: ['rule-parent', 'rule-child', 'rule-explicit'],
      }),
    );
  });
});
