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
});
