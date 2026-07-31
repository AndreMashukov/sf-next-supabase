import type { GenerationJob } from './generation-job';

export interface Document {
  id: string;
  userId: string;
  title: string;
  description: string;
  wordCount: number;
  storagePath: string;
  directoryId: string | null;
  appliedRuleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Directory {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  description: string;
  path: string;
  level: number;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryTreeNode extends Directory {
  children: DirectoryTreeNode[];
  ruleIds: string[];
}

export interface Rule {
  id: string;
  userId: string;
  name: string;
  description: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
  hint?: string;
}

export interface Quiz {
  id: string;
  userId: string;
  documentId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export type {
  AgentActionKind,
  AgentActionResult,
  AgentDeleteTarget,
  AgentMessageInput,
  AgentMessageRequest,
  AgentMessageResponse,
  AgentProposedDelete,
} from './agent';

export {
  agentActionKindSchema,
  agentActionResultSchema,
  agentDeleteTargetSchema,
  agentMessageResponseSchema,
  agentMessageSchema,
  agentProposedDeleteSchema,
} from './agent';

export type {
  AttachRuleToDirectoryInput,
  AttachRuleToDirectoryRequest,
  CreateDirectoryInput,
  CreateDirectoryRequest,
  CreateDocumentInput,
  CreateDocumentRequest,
  CreateRuleInput,
  CreateRuleRequest,
  DeleteDirectoryInput,
  DeleteDirectoryRequest,
  DeleteDocumentsInput,
  DeleteDocumentsRequest,
  DeleteQuizzesInput,
  DeleteQuizzesRequest,
  DeleteRuleRequest,
  DetachRuleFromDirectoryInput,
  DetachRuleFromDirectoryRequest,
  GenerateQuizInput,
  GenerateQuizRequest,
  MoveDirectoryInput,
  MoveDirectoryRequest,
  MoveDocumentInput,
  MoveDocumentRequest,
  QuizResponsePayload,
  UpdateDirectoryInput,
  UpdateDirectoryRequest,
  UpdateDocumentInput,
  UpdateDocumentRequest,
  UpdateQuizInput,
  UpdateQuizRequest,
  UpdateRuleInput,
  UpdateRuleRequest,
} from './validation';

export {
  attachRuleToDirectorySchema,
  createDirectorySchema,
  createDocumentSchema,
  createRuleSchema,
  deleteDirectorySchema,
  deleteDocumentsSchema,
  deleteQuizzesSchema,
  deleteRuleSchema,
  detachRuleFromDirectorySchema,
  formatValidationError,
  generateQuizSchema,
  moveDirectorySchema,
  moveDocumentSchema,
  parseRequest,
  quizQuestionSchema,
  quizResponseSchema,
  updateDirectorySchema,
  updateDocumentSchema,
  updateQuizSchema,
  updateRuleSchema,
  countWords,
} from './validation';

export type {
  GenerationArtifactRef,
  GenerationJob,
  GenerationJobInput,
  GenerationJobKind,
  GenerationJobResult,
  GenerationJobStatus,
  CreateDocumentGenerationResponse,
  GenerateQuizGenerationResponse,
} from './generation-job';

export {
  generationArtifactRefSchema,
  generationJobInputSchema,
  generationJobKindSchema,
  generationJobResultSchema,
  generationJobSchema,
  generationJobStatusSchema,
} from './generation-job';

export interface CreateDocumentResponse {
  job: GenerationJob;
}

export interface GenerateQuizResponse {
  job: GenerationJob;
}

export interface CreateRuleResponse {
  rule: Rule;
}

export interface UpdateRuleResponse {
  rule: Rule;
}

export interface DeleteRuleResponse {
  success: boolean;
}

export interface CreateDirectoryResponse {
  directory: Directory;
}

export interface UpdateDirectoryResponse {
  directory: Directory;
}

export interface MoveDirectoryResponse {
  directory: Directory;
}

export interface DeleteDirectoryResponse {
  success: boolean;
  deletedDirectories: number;
  deletedDocuments: number;
}

export interface DeleteDocumentsResponse {
  success: boolean;
  deletedDocuments: number;
}

export interface DeleteQuizzesResponse {
  success: boolean;
  deletedQuizzes: number;
}

export interface MoveDocumentResponse {
  document: Document;
}

export interface AttachRuleToDirectoryResponse {
  success: boolean;
}

export interface DetachRuleFromDirectoryResponse {
  success: boolean;
}

export interface ListRulesResponse {
  rules: Rule[];
}

export interface ApiError {
  error: string;
}

export interface AgentMessageApiResponse {
  reply: string;
  threadId: string;
  executedActions: import('./agent').AgentActionResult[];
  proposedDeletes: import('./agent').AgentProposedDelete[];
}

export interface UpdateDocumentResponse {
  document: Document;
}

export interface UpdateQuizResponse {
  quiz: Quiz;
}

export type { Database } from './database.types';

export {
  ALLOWED_HTML_TAGS,
  buildDocumentPrompt,
  buildDocumentPromptSections,
  buildSealedOutputContract,
  DISALLOWED_EVENT_HANDLER_PREFIX,
  DISALLOWED_HTML_ATTRIBUTES,
  DISALLOWED_HTML_TAGS,
  DOCUMENT_AGENT_MAX_REPAIR_RETRIES,
  MERMAID_DIAGRAM_PREFIXES,
  SEALED_OUTPUT_CONTRACT_LINES,
  WRAPPER_HTML_TAGS,
} from './document-contract';
