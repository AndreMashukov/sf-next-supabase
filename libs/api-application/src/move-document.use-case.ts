import { NotFoundError, type DirectoryRepository, type DocumentRepository, type MoveDocumentInput } from '@sf/api-domain';
import { getDirectoryOrThrow } from './directory.helpers';

export class MoveDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly directoryRepository: DirectoryRepository,
  ) {}

  async execute(input: MoveDocumentInput) {
    const document = await this.documentRepository.findByIdForUser(
      input.documentId,
      input.userId,
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (input.directoryId) {
      await getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId);
    }

    const updatedDocument = await this.documentRepository.updateDirectoryId(
      input.documentId,
      input.userId,
      input.directoryId ?? null,
    );

    return updatedDocument;
  }
}
