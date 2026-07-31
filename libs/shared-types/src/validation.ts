import { z, type ZodError, type ZodType } from 'zod';

const uuidSchema = z.string().uuid('Invalid rule ID');

export const ruleIdsSchema = z
  .array(uuidSchema)
  .optional()
  .default([])
  .transform((ids) => ids.filter((id, index, arr) => arr.indexOf(id) === index));

const directoryIdSchema = z
  .string()
  .uuid('Invalid directory ID')
  .optional()
  .nullable()
  .transform((value) => value ?? undefined);

export const createDocumentSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    text: z.string().trim().min(1, 'Document prompt is required').max(100_000),
    ruleIds: ruleIdsSchema,
    directoryId: directoryIdSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.directoryId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Documents must be created inside a folder',
        path: ['directoryId'],
      });
    }
  });

const directoryColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color')
  .optional()
  .default('#8b5cf6');

const directoryIconSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .optional()
  .default('Folder');

export const createDirectorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Directory name is required')
    .max(100, 'Directory name must be 100 characters or fewer')
    .refine((value) => !/[\\/:*?"<>|]/.test(value), 'Directory name contains invalid characters'),
  parentId: directoryIdSchema,
  description: z.string().trim().optional().default(''),
  color: directoryColorSchema,
  icon: directoryIconSchema,
});

export const updateDirectorySchema = z
  .object({
    directoryId: z.string().uuid('Invalid directory ID'),
    name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((value) => !/[\\/:*?"<>|]/.test(value), 'Directory name contains invalid characters')
      .optional(),
    description: z.string().trim().optional(),
    color: directoryColorSchema.optional(),
    icon: directoryIconSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.name === undefined &&
      value.description === undefined &&
      value.color === undefined &&
      value.icon === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'No fields to update',
        path: [],
      });
    }
  });

export const moveDirectorySchema = z.object({
  directoryId: z.string().uuid('Invalid directory ID'),
  parentId: directoryIdSchema,
});

export const deleteDirectorySchema = z.object({
  directoryId: z.string().uuid('Invalid directory ID'),
});

export const moveDocumentSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  directoryId: directoryIdSchema,
});

export const attachRuleToDirectorySchema = z.object({
  directoryId: z.string().uuid('Invalid directory ID'),
  ruleId: uuidSchema,
});

export const detachRuleFromDirectorySchema = z.object({
  directoryId: z.string().uuid('Invalid directory ID'),
  ruleId: uuidSchema,
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

const idArraySchema = z
  .array(z.string().uuid('Invalid ID'))
  .min(1, 'At least one ID is required')
  .max(100)
  .transform((ids) => ids.filter((id, index, arr) => arr.indexOf(id) === index));

export const deleteDocumentsSchema = z.object({
  documentIds: idArraySchema,
});

export const deleteQuizzesSchema = z.object({
  quizIds: idArraySchema,
});

export const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  hint: z.string().min(1).optional(),
});

export const updateDocumentSchema = z
  .object({
    documentId: z.string().uuid('Invalid document ID'),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().optional(),
    html: z.string().trim().min(1).max(500_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.title === undefined && value.description === undefined && value.html === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'No fields to update',
        path: [],
      });
    }
  });

export const updateQuizSchema = z
  .object({
    quizId: z.string().uuid('Invalid quiz ID'),
    title: z.string().trim().min(1).max(200).optional(),
    questions: z.array(quizQuestionSchema).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.title === undefined && value.questions === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'No fields to update',
        path: [],
      });
    }
  });

export { agentMessageSchema } from './agent';

export const quizResponseSchema = z.object({
  title: z.string().min(1),
  questions: z.array(quizQuestionSchema).min(1),
});

export type CreateDocumentRequest = z.input<typeof createDocumentSchema>;
export type CreateDocumentInput = z.output<typeof createDocumentSchema>;
export type CreateDirectoryRequest = z.input<typeof createDirectorySchema>;
export type CreateDirectoryInput = z.output<typeof createDirectorySchema>;
export type UpdateDirectoryRequest = z.input<typeof updateDirectorySchema>;
export type UpdateDirectoryInput = z.output<typeof updateDirectorySchema>;
export type MoveDirectoryRequest = z.input<typeof moveDirectorySchema>;
export type MoveDirectoryInput = z.output<typeof moveDirectorySchema>;
export type DeleteDirectoryRequest = z.input<typeof deleteDirectorySchema>;
export type DeleteDirectoryInput = z.output<typeof deleteDirectorySchema>;
export type MoveDocumentRequest = z.input<typeof moveDocumentSchema>;
export type MoveDocumentInput = z.output<typeof moveDocumentSchema>;
export type AttachRuleToDirectoryRequest = z.input<typeof attachRuleToDirectorySchema>;
export type AttachRuleToDirectoryInput = z.output<typeof attachRuleToDirectorySchema>;
export type DetachRuleFromDirectoryRequest = z.input<typeof detachRuleFromDirectorySchema>;
export type DetachRuleFromDirectoryInput = z.output<typeof detachRuleFromDirectorySchema>;
export type GenerateQuizRequest = z.input<typeof generateQuizSchema>;
export type GenerateQuizInput = z.output<typeof generateQuizSchema>;
export type CreateRuleRequest = z.input<typeof createRuleSchema>;
export type CreateRuleInput = z.output<typeof createRuleSchema>;
export type UpdateRuleRequest = z.input<typeof updateRuleSchema>;
export type UpdateRuleInput = z.output<typeof updateRuleSchema>;
export type DeleteRuleRequest = z.input<typeof deleteRuleSchema>;
export type DeleteDocumentsRequest = z.input<typeof deleteDocumentsSchema>;
export type DeleteDocumentsInput = z.output<typeof deleteDocumentsSchema>;
export type DeleteQuizzesRequest = z.input<typeof deleteQuizzesSchema>;
export type DeleteQuizzesInput = z.output<typeof deleteQuizzesSchema>;
export type UpdateDocumentRequest = z.input<typeof updateDocumentSchema>;
export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;
export type UpdateQuizRequest = z.input<typeof updateQuizSchema>;
export type UpdateQuizInput = z.output<typeof updateQuizSchema>;
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
