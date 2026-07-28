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

export interface CreateDocumentRequest {
  title: string;
  text: string;
  ruleIds?: string[];
}

export interface CreateDocumentResponse {
  document: Document;
}

export interface GenerateQuizRequest {
  documentId: string;
  title?: string;
  questionCount?: number;
}

export interface GenerateQuizResponse {
  quiz: Quiz;
}

export interface CreateRuleRequest {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}

export interface CreateRuleResponse {
  rule: Rule;
}

export interface UpdateRuleRequest {
  ruleId: string;
  name?: string;
  description?: string;
  content?: string;
  isDefault?: boolean;
}

export interface UpdateRuleResponse {
  rule: Rule;
}

export interface DeleteRuleRequest {
  ruleId: string;
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
