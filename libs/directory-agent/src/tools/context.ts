import type { AgentActionResult, AgentProposedDelete, GenerationJob } from '@sf/shared-types';
import type {
  CreateDirectoryInput,
  GenerateQuizInput,
  MoveDirectoryInput,
  MoveDocumentInput,
  UpdateDirectoryInput,
  UpdateDocumentInput,
  UpdateQuizInput,
} from '@sf/api-domain';
import type { Directory, Document, Quiz } from '@sf/shared-types';

export interface DirectoryAgentDirectoryService {
  execute(input: CreateDirectoryInput): Promise<Directory>;
}

export interface DirectoryAgentUpdateDirectoryService {
  execute(input: UpdateDirectoryInput): Promise<Directory>;
}

export interface DirectoryAgentMoveDirectoryService {
  execute(input: MoveDirectoryInput): Promise<Directory>;
}

export interface DirectoryAgentCreateDocumentService {
  start(input: {
    userId: string;
    title: string;
    text: string;
    ruleIds: string[];
    directoryId?: string;
    followUpQuiz?: { title?: string; questionCount?: number };
  }): Promise<GenerationJob>;
}

export interface DirectoryAgentUpdateDocumentService {
  execute(input: UpdateDocumentInput): Promise<Document>;
}

export interface DirectoryAgentMoveDocumentService {
  execute(input: MoveDocumentInput): Promise<Document>;
}

export interface DirectoryAgentGenerateQuizService {
  start(input: GenerateQuizInput): Promise<GenerationJob>;
}

export interface DirectoryAgentUpdateQuizService {
  execute(input: UpdateQuizInput): Promise<Quiz>;
}

export interface DirectoryAgentDependencies {
  directoryRepository: import('@sf/api-domain').DirectoryRepository;
  documentRepository: import('@sf/api-domain').DocumentRepository;
  quizRepository: import('@sf/api-domain').QuizRepository;
  vectorIndexRepository: import('@sf/api-domain').VectorIndexRepository;
  embeddingService: import('@sf/api-domain').EmbeddingService;
  createDirectoryUseCase: DirectoryAgentDirectoryService;
  updateDirectoryUseCase: DirectoryAgentUpdateDirectoryService;
  moveDirectoryUseCase: DirectoryAgentMoveDirectoryService;
  createDocumentUseCase: DirectoryAgentCreateDocumentService;
  updateDocumentUseCase: DirectoryAgentUpdateDocumentService;
  moveDocumentUseCase: DirectoryAgentMoveDocumentService;
  generateQuizUseCase: DirectoryAgentGenerateQuizService;
  updateQuizUseCase: DirectoryAgentUpdateQuizService;
}

export interface DirectoryAgentRuntimeContext extends DirectoryAgentDependencies {
  userId: string;
  directoryId: string;
  directoryIds: string[];
  executedActions: AgentActionResult[];
  proposedDeletes: AgentProposedDelete[];
}

export function createAgentRuntimeContext(input: {
  deps: DirectoryAgentDependencies;
  userId: string;
  directoryId: string;
  directoryIds: string[];
}): DirectoryAgentRuntimeContext {
  return {
    ...input.deps,
    userId: input.userId,
    directoryId: input.directoryId,
    directoryIds: input.directoryIds,
    executedActions: [],
    proposedDeletes: [],
  };
}

export function assertDirectoryInScope(context: DirectoryAgentRuntimeContext, directoryId?: string | null) {
  if (directoryId && !context.directoryIds.includes(directoryId)) {
    throw new Error('Target directory is outside the current folder scope');
  }
}

export async function assertDocumentInScope(context: DirectoryAgentRuntimeContext, documentId: string) {
  const document = await context.documentRepository.findByIdForUser(documentId, context.userId);
  if (!document) {
    throw new Error('Document not found');
  }
  if (!document.directoryId || !context.directoryIds.includes(document.directoryId)) {
    throw new Error('Document is outside the current folder scope');
  }
  return document;
}

export async function assertQuizInScope(context: DirectoryAgentRuntimeContext, quizId: string) {
  const quiz = await context.quizRepository.findByIdForUser(quizId, context.userId);
  if (!quiz) {
    throw new Error('Quiz not found');
  }
  await assertDocumentInScope(context, quiz.documentId);
  return quiz;
}
