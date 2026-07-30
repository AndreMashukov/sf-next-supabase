import type { Document, Quiz, Rule } from '@sf/shared-types';

export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message = 'Method not allowed') {
    super(message, 405);
    this.name = 'MethodNotAllowedError';
  }
}

export interface AuthService {
  getUserIdFromBearerToken(token: string): Promise<string | null>;
}

export interface CreateDocumentInput {
  userId: string;
  title: string;
  text: string;
  ruleIds: string[];
}

export interface GenerateQuizInput {
  userId: string;
  documentId: string;
  title?: string;
  questionCount: number;
}

export interface CreateRuleInput {
  userId: string;
  name: string;
  description: string;
  content: string;
  isDefault: boolean;
}

export interface UpdateRuleInput {
  userId: string;
  ruleId: string;
  name?: string;
  description?: string;
  content?: string;
  isDefault?: boolean;
}

export interface DeleteRuleInput {
  userId: string;
  ruleId: string;
}

export interface RulePromptRecord {
  name: string;
  content: string;
}

export interface DocumentRepository {
  create(input: {
    id: string;
    userId: string;
    title: string;
    description: string;
    wordCount: number;
    storagePath: string;
    appliedRuleIds: string[];
  }): Promise<Document>;

  findByIdForUser(documentId: string, userId: string): Promise<Document | null>;
}

export interface RuleRepository {
  verifyOwnership(userId: string, ruleIds: string[]): Promise<void>;

  fetchByIds(userId: string, ruleIds: string[]): Promise<RulePromptRecord[]>;

  create(input: CreateRuleInput): Promise<Rule>;

  update(input: UpdateRuleInput): Promise<Rule>;

  delete(input: DeleteRuleInput): Promise<boolean>;
}

export interface QuizRepository {
  create(input: {
    userId: string;
    documentId: string;
    title: string;
    questions: Quiz['questions'];
  }): Promise<Quiz>;
}

export interface StorageService {
  uploadHtml(objectPath: string, html: string): Promise<void>;

  downloadHtml(objectPath: string): Promise<string>;

  deleteObject(objectPath: string): Promise<void>;
}

export interface DocumentGeneratorService {
  isAgentEnabled(): boolean;

  generate(title: string, text: string, rules: RulePromptRecord[]): Promise<string>;
}

export interface QuizGeneratorService {
  generateFromHtml(
    html: string,
    documentTitle: string,
    questionCount: number,
  ): Promise<{ title: string; questions: Quiz['questions'] }>;
}

export interface RuleRecordRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecordRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  word_count: number;
  storage_path: string;
  applied_rule_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface QuizRecordRow {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  questions: Quiz['questions'];
  created_at: string;
  updated_at: string;
}

export function mapRuleRow(row: RuleRecordRow): Rule {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    content: row.content,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDocumentRow(row: DocumentRecordRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    wordCount: row.word_count,
    storagePath: row.storage_path,
    appliedRuleIds: row.applied_rule_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuizRow(row: QuizRecordRow): Quiz {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    title: row.title,
    questions: row.questions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatRulesForPrompt(rules: RulePromptRecord[]): string {
  if (rules.length === 0) {
    return '';
  }

  const separator = '─'.repeat(61);
  const ruleBlocks = rules.map((rule, index) => {
    return `${separator}
RULE #${index + 1} - ${rule.name}
${separator}
${rule.content}`;
  });

  return `
${separator}
ADDITIONAL RULES TO FOLLOW:

The user has selected the following rules to guide your response.
Please consider all rules intelligently, prioritizing based on context.

${ruleBlocks.join('\n\n')}

${separator}
END OF RULES

Please generate content that follows these rules while maintaining
coherence and quality.
`;
}
