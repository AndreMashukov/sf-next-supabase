import {
  NotFoundError,
  type DeleteDirectoryInput,
  type DirectoryRepository,
  type DocumentRepository,
  type StorageService,
} from '@sf/api-domain';
import { getDirectoryOrThrow } from './directory.helpers';

export class DeleteDirectoryUseCase {
  constructor(
    private readonly directoryRepository: DirectoryRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(input: DeleteDirectoryInput) {
    await getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId);

    const directoryIds = await this.directoryRepository.listDescendantIds(
      input.userId,
      input.directoryId,
    );
    const documents = await this.documentRepository.listByDirectoryIds(
      input.userId,
      directoryIds,
    );

    for (const document of documents) {
      await this.storageService.deleteObject(document.storagePath);
    }

    const deletedDocuments = await this.documentRepository.deleteByIds(
      input.userId,
      documents.map((document) => document.id),
    );
    const deletedDirectories = await this.directoryRepository.deleteByIds(
      input.userId,
      directoryIds,
    );

    if (deletedDirectories === 0) {
      throw new NotFoundError('Directory not found');
    }

    return {
      success: true as const,
      deletedDirectories,
      deletedDocuments,
    };
  }
}
