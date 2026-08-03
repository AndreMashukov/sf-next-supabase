import {
  NotFoundError,
  type DocumentRepository,
  type StorageService,
  type UpdateDocumentInput,
} from '@sf/api-domain';
import { countWords } from '@sf/shared-types';
import { KnowledgeIndexerService } from '../knowledge/knowledge-indexer.service';
import { normalizeGeneratedHtml, wrapHtmlDocument } from '../shared/html';

export class UpdateDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
    private readonly knowledgeIndexer: KnowledgeIndexerService,
  ) {}

  async execute(input: UpdateDocumentInput) {
    const document = await this.documentRepository.findByIdForUser(
      input.documentId,
      input.userId,
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    let htmlForIndex: string | undefined;

    if (input.html !== undefined) {
      const normalizedHtml = normalizeGeneratedHtml(input.html);
      const wrappedHtml = wrapHtmlDocument(normalizedHtml, document.title);
      await this.storageService.uploadHtml(document.storagePath, wrappedHtml);
      htmlForIndex = wrappedHtml;
    }

    const updatedDocument = await this.documentRepository.update({
      userId: input.userId,
      documentId: input.documentId,
      title: input.title,
      description: input.description,
      wordCount:
        input.html !== undefined
          ? countWords(stripTextFromHtml(input.html))
          : undefined,
    });

    await this.knowledgeIndexer.indexDocument(updatedDocument, htmlForIndex);

    return updatedDocument;
  }
}

function stripTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
