import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  text: z.string().trim().min(1, 'Document text is required').max(100_000),
});

export const generateQuizSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  title: z.string().trim().min(1).max(200).optional(),
  questionCount: z.number().int().min(1).max(20).optional().default(5),
});

export const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const quizResponseSchema = z.object({
  title: z.string().min(1),
  questions: z.array(quizQuestionSchema).min(1),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;
export type QuizResponsePayload = z.infer<typeof quizResponseSchema>;

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').join('<br />');
      return `<p>${lines}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>Document</title>\n</head>\n<body>\n${paragraphs}\n</body>\n</html>`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
