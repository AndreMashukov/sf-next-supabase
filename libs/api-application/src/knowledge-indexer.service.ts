import { createHash } from 'node:crypto';
import type {
  DirectoryRepository,
  DocumentRepository,
  EmbeddingService,
  QuizRepository,
  StorageService,
  VectorIndexRepository,
} from '@sf/api-domain';
import type { Directory, Document, Quiz, QuizQuestion } from '@sf/shared-types';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function formatQuizChunk(quiz: Quiz): string {
  const questionBlocks = quiz.questions.map((question: QuizQuestion, index: number) => {
    const options = question.options.map((option, optionIndex) => `${optionIndex + 1}. ${option}`).join('\n');
    return `Question ${index + 1}: ${question.question}\nOptions:\n${options}\nExplanation: ${question.explanation}`;
  });

  return `Quiz: ${quiz.title}\n${questionBlocks.join('\n\n')}`;
}

function formatDirectoryChunk(directory: Directory): string {
  return `Directory: ${directory.name}\nPath: ${directory.path}\nDescription: ${directory.description || 'No description'}`;
}

export class KnowledgeIndexerService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorIndexRepository: VectorIndexRepository,
    private readonly storageService: StorageService,
  ) {}

  async indexDirectory(directory: Directory) {
    const content = formatDirectoryChunk(directory);
    const chunks = chunkText(content);

    await this.indexChunks({
      userId: directory.userId,
      directoryId: directory.id,
      sourceType: 'directory',
      sourceId: directory.id,
      sourceTitle: directory.name,
      chunks,
    });
  }

  async indexDocument(document: Document, html?: string) {
    const resolvedHtml = html ?? (await this.storageService.downloadHtml(document.storagePath));
    const text = stripHtmlToText(resolvedHtml);
    const header = `Document: ${document.title}\nDescription: ${document.description || 'No description'}\n\n`;
    const chunks = chunkText(`${header}${text}`);

    await this.indexChunks({
      userId: document.userId,
      directoryId: document.directoryId,
      documentId: document.id,
      sourceType: 'document',
      sourceId: document.id,
      sourceTitle: document.title,
      chunks,
    });
  }

  async indexQuiz(quiz: Quiz, documentDirectoryId: string | null) {
    const content = formatQuizChunk(quiz);
    const chunks = chunkText(content);

    await this.indexChunks({
      userId: quiz.userId,
      directoryId: documentDirectoryId,
      quizId: quiz.id,
      sourceType: 'quiz',
      sourceId: quiz.id,
      sourceTitle: quiz.title,
      chunks,
    });
  }

  async deleteDirectoryIndex(userId: string, directoryId: string) {
    await this.vectorIndexRepository.deleteBySource(userId, 'directory', directoryId);
  }

  async deleteDocumentIndex(userId: string, documentId: string) {
    await this.vectorIndexRepository.deleteBySource(userId, 'document', documentId);
  }

  async deleteQuizIndex(userId: string, quizId: string) {
    await this.vectorIndexRepository.deleteBySource(userId, 'quiz', quizId);
  }

  async deleteDocumentIndexes(userId: string, documentIds: string[]) {
    await this.vectorIndexRepository.deleteByDocumentIds(userId, documentIds);
  }

  async deleteDirectoryIndexes(userId: string, directoryIds: string[]) {
    await this.vectorIndexRepository.deleteByDirectoryIds(userId, directoryIds);
  }

  async backfillUserKnowledge(input: {
    userId: string;
    directoryRepository: DirectoryRepository;
    documentRepository: DocumentRepository;
    quizRepository: QuizRepository;
  }) {
    const directories = await input.directoryRepository.listForUser(input.userId);
    for (const directory of directories) {
      await this.indexDirectory(directory);
    }

    const directoryIds = directories.map((directory) => directory.id);
    const documents = await input.documentRepository.listByDirectoryIds(input.userId, directoryIds);

    for (const document of documents) {
      await this.indexDocument(document);
    }

    const quizzes = await input.quizRepository.listByDocumentIds(
      input.userId,
      documents.map((document) => document.id),
    );

    const documentDirectoryById = new Map(documents.map((document) => [document.id, document.directoryId]));

    for (const quiz of quizzes) {
      await this.indexQuiz(quiz, documentDirectoryById.get(quiz.documentId) ?? null);
    }
  }

  private async indexChunks(input: {
    userId: string;
    directoryId: string | null;
    documentId?: string;
    quizId?: string;
    sourceType: 'directory' | 'document' | 'quiz';
    sourceId: string;
    sourceTitle: string;
    chunks: string[];
  }) {
    if (input.chunks.length === 0) {
      await this.vectorIndexRepository.deleteBySource(input.userId, input.sourceType, input.sourceId);
      return;
    }

    const embeddings = await this.embeddingService.embedTexts(input.chunks);

    await this.vectorIndexRepository.replaceSourceChunks({
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunks: input.chunks.map((content, chunkIndex) => ({
        userId: input.userId,
        directoryId: input.directoryId,
        documentId: input.documentId,
        quizId: input.quizId,
        sourceType: input.sourceType,
        sourceTitle: input.sourceTitle,
        chunkIndex,
        content,
        contentHash: hashContent(content),
        metadata: {
          sourceId: input.sourceId,
        },
        embedding: embeddings[chunkIndex] ?? [],
      })),
    });
  }
}
