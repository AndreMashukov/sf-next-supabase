import { DeleteDirectoryUseCase } from '@sf/api-application';
import { describe, expect, it, vi } from 'vitest';

describe('DeleteDirectoryUseCase', () => {
  it('deletes document storage before removing database rows', async () => {
    const directoryRepository = {
      findByIdForUser: vi.fn().mockResolvedValue({
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
      listDescendantIds: vi.fn().mockResolvedValue(['dir-1']),
      deleteByIds: vi.fn().mockResolvedValue(1),
    };
    const documentRepository = {
      listByDirectoryIds: vi.fn().mockResolvedValue([
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

    const useCase = new DeleteDirectoryUseCase(
      directoryRepository,
      documentRepository,
      storageService,
    );

    const result = await useCase.execute({ userId: 'user-1', directoryId: 'dir-1' });

    expect(storageService.deleteObject).toHaveBeenCalledWith(
      'users/user-1/documents/doc-1/content.html',
    );
    expect(documentRepository.deleteByIds).toHaveBeenCalledWith('user-1', ['doc-1']);
    expect(directoryRepository.deleteByIds).toHaveBeenCalledWith('user-1', ['dir-1']);
    expect(result).toEqual({
      success: true,
      deletedDirectories: 1,
      deletedDocuments: 1,
    });
  });
});
