'use client';

import {
  deleteQuizzesSchema,
  generateQuizSchema,
  parseRequest,
  type DeleteQuizzesResponse,
  type GenerateQuizResponse,
} from '@sf/shared-types';
import { postJson } from './client';

export async function generateQuiz(documentId: string, title?: string, questionCount = 5) {
  const body = parseRequest(generateQuizSchema, { documentId, title, questionCount });
  const payload = await postJson<GenerateQuizResponse>('generate-quiz', body);
  if (!payload.job?.id || !payload.job.status) {
    throw new Error('API did not return a generation job. Restart the API server.');
  }
  return payload.job;
}

export async function deleteQuiz(quizId: string) {
  return deleteQuizzes([quizId]);
}

export async function deleteQuizzes(quizIds: string[]) {
  const body = parseRequest(deleteQuizzesSchema, { quizIds });
  const payload = await postJson<DeleteQuizzesResponse>('delete-quizzes', body);
  return payload;
}
