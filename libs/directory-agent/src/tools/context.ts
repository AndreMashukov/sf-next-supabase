import type { AgentActionResult, AgentProposedDelete, AgentScope, GenerationJob, Rule } from '@sf/shared-types';
import type {
  AttachRuleToDirectoryInput,
  CreateDirectoryInput,
  CreateRuleInput,
  DetachRuleFromDirectoryInput,
  GenerateQuizInput,
  MoveDirectoryInput,
  MoveDocumentInput,
  UpdateDirectoryInput,
  UpdateDocumentInput,
  UpdateQuizInput,
  UpdateRuleInput,
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

export interface DirectoryAgentCreateRuleService {
  execute(input: CreateRuleInput): Promise<Rule>;
}

export interface DirectoryAgentUpdateRuleService {
  execute(input: UpdateRuleInput): Promise<Rule>;
}

export interface DirectoryAgentAttachRuleService {
  execute(input: AttachRuleToDirectoryInput): Promise<{ success: true }>;
}

export interface DirectoryAgentDetachRuleService {
  execute(input: DetachRuleFromDirectoryInput): Promise<{ success: true }>;
}

export interface DirectoryAgentDependencies {
  directoryRepository: import('@sf/api-domain').DirectoryRepository;
  documentRepository: import('@sf/api-domain').DocumentRepository;
  quizRepository: import('@sf/api-domain').QuizRepository;
  ruleRepository: import('@sf/api-domain').RuleRepository;
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
  createRuleUseCase: DirectoryAgentCreateRuleService;
  updateRuleUseCase: DirectoryAgentUpdateRuleService;
  attachRuleToDirectoryUseCase: DirectoryAgentAttachRuleService;
  detachRuleFromDirectoryUseCase: DirectoryAgentDetachRuleService;
}

export interface DirectoryAgentRuntimeContext extends DirectoryAgentDependencies {
  userId: string;
  scope: AgentScope;
  directoryId?: string;
  directoryIds: string[];
  executedActions: AgentActionResult[];
  proposedDeletes: AgentProposedDelete[];
}

export function createAgentRuntimeContext(input: {
  deps: DirectoryAgentDependencies;
  userId: string;
  scope: AgentScope;
  directoryId?: string;
  directoryIds: string[];
}): DirectoryAgentRuntimeContext {
  return {
    ...input.deps,
    userId: input.userId,
    scope: input.scope,
    directoryId: input.directoryId,
    directoryIds: input.directoryIds,
    executedActions: [],
    proposedDeletes: [],
  };
}

export function isDirectoryInScope(context: DirectoryAgentRuntimeContext, directoryId?: string | null): boolean {
  if (!directoryId) {
    return true;
  }
  if (context.scope === 'workspace') {
    return context.directoryIds.includes(directoryId);
  }
  return context.directoryIds.includes(directoryId);
}

export function assertDirectoryInScope(context: DirectoryAgentRuntimeContext, directoryId?: string | null) {
  if (directoryId && !isDirectoryInScope(context, directoryId)) {
    throw new Error('Target directory is outside the current scope');
  }
}

export async function assertDocumentInScope(context: DirectoryAgentRuntimeContext, documentId: string) {
  const document = await context.documentRepository.findByIdForUser(documentId, context.userId);
  if (!document) {
    throw new Error('Document not found');
  }
  if (context.scope === 'workspace') {
    return document;
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
  if (context.scope === 'workspace') {
    return quiz;
  }
  await assertDocumentInScope(context, quiz.documentId);
  return quiz;
}

export async function assertRuleInScope(context: DirectoryAgentRuntimeContext, ruleId: string) {
  const rule = await context.ruleRepository.findByIdForUser(ruleId, context.userId);
  if (!rule) {
    throw new Error('Rule not found');
  }
  return rule;
}

export function resolveDefaultParentId(context: DirectoryAgentRuntimeContext, parentId?: string): string | undefined {
  if (parentId) {
    return parentId;
  }
  if (context.scope === 'directory' && context.directoryId) {
    return context.directoryId;
  }
  return undefined;
}

export function resolveDefaultDirectoryId(
  context: DirectoryAgentRuntimeContext,
  directoryId?: string | null,
): string | undefined {
  // Explicit null means unfiled, even when a preferred folder context exists.
  if (directoryId === null) {
    return undefined;
  }
  if (directoryId) {
    return directoryId;
  }
  // Prefer the caller's current folder for both directory and workspace scope.
  if (context.directoryId) {
    return context.directoryId;
  }
  return undefined;
}
