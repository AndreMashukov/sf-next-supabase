export interface Document {
  id: string;
  userId: string;
  title: string;
  description: string;
  wordCount: number;
  storagePath: string;
  appliedRuleIds: string[];
  createdAt: string;
  updatedAt: string;
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
  CreateDocumentInput,
  CreateDocumentRequest,
  CreateRuleInput,
  CreateRuleRequest,
  DeleteRuleRequest,
  GenerateQuizInput,
  GenerateQuizRequest,
  QuizResponsePayload,
  UpdateRuleInput,
  UpdateRuleRequest,
} from './validation';

export {
  createDocumentSchema,
  createRuleSchema,
  deleteRuleSchema,
  formatValidationError,
  generateQuizSchema,
  parseRequest,
  quizQuestionSchema,
  quizResponseSchema,
  updateRuleSchema,
  countWords,
} from './validation';

export interface CreateDocumentResponse {
  document: Document;
}

export interface GenerateQuizResponse {
  quiz: Quiz;
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

export interface ListRulesResponse {
  rules: Rule[];
}

export interface ApiError {
  error: string;
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
