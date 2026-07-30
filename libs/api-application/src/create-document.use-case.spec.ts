import { CreateDocumentUseCase } from '@sf/api-application';
import { describe, expect, it, vi } from 'vitest';

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
      isAgentEnabled: vi.fn().mockReturnValue(false),
      generate: vi.fn().mockResolvedValue('<p>Generated</p>'),
    };

    const useCase = new CreateDocumentUseCase(
      documentRepository,
      ruleRepository,
      directoryRepository,
      storageService,
      documentGenerator,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        title: 'Title',
        text: 'Prompt',
        ruleIds: [],
      }),
    ).rejects.toThrow('Failed to create document record');

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
      isAgentEnabled: vi.fn().mockReturnValue(false),
      generate: vi.fn().mockResolvedValue('<p>Generated</p>'),
    };

    const useCase = new CreateDocumentUseCase(
      documentRepository,
      ruleRepository,
      directoryRepository,
      storageService,
      documentGenerator,
    );

    await useCase.execute({
      userId: 'user-1',
      title: 'Title',
      text: 'Prompt',
      ruleIds: ['rule-explicit'],
      directoryId: 'dir-child',
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
