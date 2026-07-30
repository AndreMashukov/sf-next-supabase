import { randomUUID } from 'node:crypto';
import {
  resolveEffectiveRuleIds,
  type DirectoryRepository,
  type DocumentGeneratorService,
  type DocumentRepository,
  type RuleRepository,
  type StorageService,
} from '@sf/api-domain';
import { buildDocumentStoragePath } from '@sf/gcs';
import { countWords } from '@sf/shared-types';
import { getDirectoryOrThrow } from './directory.helpers';
import { normalizeGeneratedHtml, wrapHtmlDocument } from './html';

export class CreateDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly ruleRepository: RuleRepository,
    private readonly directoryRepository: DirectoryRepository,
    private readonly storageService: StorageService,
    private readonly documentGenerator: DocumentGeneratorService,
  ) {}

  async execute(input: {
    userId: string;
    title: string;
    text: string;
    ruleIds: string[];
    directoryId?: string;
  }) {
    if (input.directoryId) {
      await getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId);
    }

    const directories = await this.directoryRepository.listForUser(input.userId);
    const ruleIdsByDirectory = await this.directoryRepository.listRuleIdsByDirectoryIds(
      directories.map((directory) => directory.id),
    );
    const effectiveRuleIds = resolveEffectiveRuleIds(
      directories,
      input.directoryId,
      ruleIdsByDirectory,
      input.ruleIds,
    );

    const documentId = randomUUID();
    const storagePath = buildDocumentStoragePath(input.userId, documentId);

    const rules = await this.ruleRepository.fetchByIds(input.userId, effectiveRuleIds);
    if (rules.length !== effectiveRuleIds.length) {
      throw new Error('One or more selected rules were not found');
    }

    const generatedContent = await this.documentGenerator.generate(
      input.title,
      input.text,
      rules,
    );
    const bodyHtml = normalizeGeneratedHtml(generatedContent);

    if (!bodyHtml) {
      throw new Error('Generated document content was empty');
    }

    const html = wrapHtmlDocument(bodyHtml, input.title);
    const wordCount = countWords(bodyHtml.replace(/<[^>]+>/g, ' '));

    await this.storageService.uploadHtml(storagePath, html);

    try {
      return await this.documentRepository.create({
        id: documentId,
        userId: input.userId,
        title: input.title,
        description: input.text.slice(0, 500),
        wordCount,
        storagePath,
        directoryId: input.directoryId,
        appliedRuleIds: effectiveRuleIds,
      });
    } catch (error) {
      await this.storageService.deleteObject(storagePath);
      throw error;
    }
  }
}
