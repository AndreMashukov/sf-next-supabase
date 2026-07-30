import type { Directory, Document, DirectoryTreeNode, Quiz, Rule } from '@sf/shared-types';

export const MAX_DIRECTORY_DEPTH = 10;

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
  directoryId?: string;
}

export interface CreateDirectoryInput {
  userId: string;
  name: string;
  parentId?: string;
  description: string;
}

export interface UpdateDirectoryInput {
  userId: string;
  directoryId: string;
  name?: string;
  description?: string;
}

export interface MoveDirectoryInput {
  userId: string;
  directoryId: string;
  parentId?: string;
}

export interface DeleteDirectoryInput {
  userId: string;
  directoryId: string;
}

export interface MoveDocumentInput {
  userId: string;
  documentId: string;
  directoryId?: string;
}

export interface AttachRuleToDirectoryInput {
  userId: string;
  directoryId: string;
  ruleId: string;
}

export interface DetachRuleFromDirectoryInput {
  userId: string;
  directoryId: string;
  ruleId: string;
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
    directoryId?: string;
    appliedRuleIds: string[];
  }): Promise<Document>;

  findByIdForUser(documentId: string, userId: string): Promise<Document | null>;

  updateDirectoryId(documentId: string, userId: string, directoryId: string | null): Promise<Document>;

  listByDirectoryIds(userId: string, directoryIds: string[]): Promise<Document[]>;

  deleteByIds(userId: string, documentIds: string[]): Promise<number>;
}

export interface DirectoryRepository {
  findByIdForUser(directoryId: string, userId: string): Promise<Directory | null>;

  listForUser(userId: string): Promise<Directory[]>;

  listRuleIdsByDirectoryIds(directoryIds: string[]): Promise<Map<string, string[]>>;

  countAttachedRules(ruleId: string): Promise<number>;

  create(input: {
    userId: string;
    name: string;
    parentId?: string;
    description: string;
    path: string;
    level: number;
  }): Promise<Directory>;

  update(input: {
    userId: string;
    directoryId: string;
    name?: string;
    description?: string;
    parentId?: string | null;
    path?: string;
    level?: number;
  }): Promise<Directory>;

  listDescendantIds(userId: string, directoryId: string): Promise<string[]>;

  deleteByIds(userId: string, directoryIds: string[]): Promise<number>;

  attachRule(directoryId: string, ruleId: string): Promise<void>;

  detachRule(directoryId: string, ruleId: string): Promise<boolean>;
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
  directory_id: string | null;
  applied_rule_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryRecordRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  path: string;
  level: number;
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
    directoryId: row.directory_id,
    appliedRuleIds: row.applied_rule_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDirectoryRow(row: DirectoryRecordRow): Directory {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description,
    path: row.path,
    level: row.level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildDirectoryPath(parentPath: string | null, name: string): string {
  if (!parentPath) {
    return `/${name}`;
  }

  return `${parentPath}/${name}`;
}

export function buildDirectoryTree(
  directories: Directory[],
  ruleIdsByDirectory: Map<string, string[]>,
): DirectoryTreeNode[] {
  const nodes = new Map<string, DirectoryTreeNode>();

  for (const directory of directories) {
    nodes.set(directory.id, {
      ...directory,
      children: [],
      ruleIds: ruleIdsByDirectory.get(directory.id) ?? [],
    });
  }

  const roots: DirectoryTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: DirectoryTreeNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function getDirectoryAncestorIds(
  directories: Directory[],
  directoryId: string,
): string[] {
  const byId = new Map(directories.map((directory) => [directory.id, directory]));
  const ancestorIds: string[] = [];
  let current = byId.get(directoryId);

  while (current?.parentId) {
    ancestorIds.unshift(current.parentId);
    current = byId.get(current.parentId);
  }

  return [...ancestorIds, directoryId];
}

export function resolveEffectiveRuleIds(
  directories: Directory[],
  directoryId: string | undefined,
  ruleIdsByDirectory: Map<string, string[]>,
  explicitRuleIds: string[],
): string[] {
  const orderedIds: string[] = [];

  if (directoryId) {
    const chain = getDirectoryAncestorIds(directories, directoryId);
    for (const id of chain) {
      for (const ruleId of ruleIdsByDirectory.get(id) ?? []) {
        if (!orderedIds.includes(ruleId)) {
          orderedIds.push(ruleId);
        }
      }
    }
  }

  for (const ruleId of explicitRuleIds) {
    if (!orderedIds.includes(ruleId)) {
      orderedIds.push(ruleId);
    }
  }

  return orderedIds;
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
