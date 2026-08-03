import { NotFoundError, type DirectoryRepository, type DocumentRepository, type MoveDocumentInput } from '@sf/api-domain';
import { getDirectoryOrThrow } from '../directories/directory.helpers';
import type { KnowledgeIndexerService } from '../knowledge/knowledge-indexer.service';

export class MoveDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly directoryRepository: DirectoryRepository,
    private readonly knowledgeIndexer?: KnowledgeIndexerService,
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

    if (this.knowledgeIndexer) {
      await this.knowledgeIndexer.indexDocument(updatedDocument);
    }

    return updatedDocument;
  }
}
