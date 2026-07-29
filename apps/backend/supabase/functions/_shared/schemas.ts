// Auto-generated from libs/shared-types/src/validation.ts. Do not edit directly.
import { z, type ZodError, type ZodType } from 'npm:zod@4.1.9';

const uuidSchema = z.string().uuid('Invalid rule ID');

export const ruleIdsSchema = z
  .array(uuidSchema)
  .optional()
  .default([])
  .transform((ids) => ids.filter((id, index, arr) => arr.indexOf(id) === index));

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  text: z.string().trim().min(1, 'Document prompt is required').max(100_000),
  ruleIds: ruleIdsSchema,
});

export const generateQuizSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  title: z.string().trim().min(1).max(200).optional(),
  questionCount: z.number().int().min(1).max(10).optional().default(5),
});

export const createRuleSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(100),
  description: z.string().trim().optional().default(''),
  content: z.string().trim().min(1, 'Rule content is required').max(100_000),
  isDefault: z.boolean().optional().default(false),
});

export const updateRuleSchema = z
  .object({
    ruleId: uuidSchema,
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().optional(),
    content: z.string().trim().min(1).max(100_000).optional(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const hasUpdateField =
      value.name !== undefined ||
      value.description !== undefined ||
      value.content !== undefined ||
      value.isDefault !== undefined;

    if (!hasUpdateField) {
      ctx.addIssue({
        code: 'custom',
        message: 'No fields to update',
        path: [],
      });
    }
  });

export const deleteRuleSchema = z.object({
  ruleId: uuidSchema,
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

export type CreateDocumentRequest = z.input<typeof createDocumentSchema>;
export type CreateDocumentInput = z.output<typeof createDocumentSchema>;
export type GenerateQuizRequest = z.input<typeof generateQuizSchema>;
export type GenerateQuizInput = z.output<typeof generateQuizSchema>;
export type CreateRuleRequest = z.input<typeof createRuleSchema>;
export type CreateRuleInput = z.output<typeof createRuleSchema>;
export type UpdateRuleRequest = z.input<typeof updateRuleSchema>;
export type UpdateRuleInput = z.output<typeof updateRuleSchema>;
export type DeleteRuleRequest = z.input<typeof deleteRuleSchema>;
export type QuizResponsePayload = z.output<typeof quizResponseSchema>;

export function formatValidationError(error: ZodError): string {
  const firstIssue = error.issues[0];
  return firstIssue?.message ?? 'Invalid request body';
}

export function parseRequest<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new Error(formatValidationError(result.error));
  }

  return result.data;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
