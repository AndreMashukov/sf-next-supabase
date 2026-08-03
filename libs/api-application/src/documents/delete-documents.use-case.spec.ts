import { DeleteDocumentsUseCase } from '@sf/api-application';
import { NotFoundError } from '@sf/api-domain';
import { describe, expect, it, vi } from 'vitest';

describe('DeleteDocumentsUseCase', () => {
  it('deletes document storage before removing database rows', async () => {
    const documentRepository = {
      findByIdsForUser: vi.fn().mockResolvedValue([
        {
          id: 'doc-1',
          userId: 'user-1',
          title: 'Doc',
          description: '',
          wordCount: 1,
          storagePath: 'users/user-1/documents/doc-1/content.html',
          directoryId: 'dir-1',
          appliedRuleIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      deleteByIds: vi.fn().mockResolvedValue(1),
    };
    const storageService = {
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new DeleteDocumentsUseCase(documentRepository, storageService);

    const result = await useCase.execute({
      userId: 'user-1',
      documentIds: ['doc-1'],
    });

    expect(storageService.deleteObject).toHaveBeenCalledWith(
      'users/user-1/documents/doc-1/content.html',
    );
    expect(documentRepository.deleteByIds).toHaveBeenCalledWith('user-1', ['doc-1']);
    expect(result).toEqual({
      success: true,
      deletedDocuments: 1,
    });
  });

  it('throws when no owned documents are found', async () => {
    const documentRepository = {
      findByIdsForUser: vi.fn().mockResolvedValue([]),
      deleteByIds: vi.fn(),
    };
    const storageService = {
      deleteObject: vi.fn(),
    };

    const useCase = new DeleteDocumentsUseCase(documentRepository, storageService);

    await expect(
      useCase.execute({ userId: 'user-1', documentIds: ['missing-doc'] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
