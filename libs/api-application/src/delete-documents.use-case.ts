import {
  NotFoundError,
  type DeleteDocumentsInput,
  type DocumentRepository,
  type StorageService,
} from '@sf/api-domain';
import type { KnowledgeIndexerService } from './knowledge-indexer.service';

export class DeleteDocumentsUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
    private readonly knowledgeIndexer?: KnowledgeIndexerService,
  ) {}

  async execute(input: DeleteDocumentsInput) {
    const documents = await this.documentRepository.findByIdsForUser(
      input.userId,
      input.documentIds,
    );

    if (documents.length === 0) {
      throw new NotFoundError('No documents found');
    }

    for (const document of documents) {
      await this.storageService.deleteObject(document.storagePath);
    }

    if (this.knowledgeIndexer) {
      await this.knowledgeIndexer.deleteDocumentIndexes(
        input.userId,
        documents.map((document) => document.id),
      );
    }

    const deletedDocuments = await this.documentRepository.deleteByIds(
      input.userId,
      documents.map((document) => document.id),
    );

    if (deletedDocuments === 0) {
      throw new NotFoundError('No documents found');
    }

    return {
      success: true as const,
      deletedDocuments,
    };
  }
}
