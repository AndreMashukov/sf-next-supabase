export interface Document {
  id: string;
  userId: string;
  title: string;
  description: string;
  wordCount: number;
  storagePath: string;
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

export interface ApiError {
  error: string;
}

export type { Database } from './database.types';
