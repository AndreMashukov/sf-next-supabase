import { z } from 'zod';

export const generationJobKindSchema = z.enum(['document', 'quiz']);
export const generationJobStatusSchema = z.enum(['pending', 'completed', 'failed']);

export const generationArtifactRefSchema = z.object({
  type: z.enum(['document', 'quiz']),
  id: z.string().uuid(),
});

export const generationJobResultSchema = z.object({
  primaryArtifact: generationArtifactRefSchema.optional(),
  artifacts: z.array(generationArtifactRefSchema).optional(),
});

export const generationJobInputSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  ruleIds: z.array(z.string().uuid()).optional(),
  directoryId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  questionCount: z.number().int().optional(),
});

export const generationJobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: generationJobKindSchema,
  status: generationJobStatusSchema,
  input: generationJobInputSchema,
  result: generationJobResultSchema,
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export type GenerationJobKind = z.infer<typeof generationJobKindSchema>;
export type GenerationJobStatus = z.infer<typeof generationJobStatusSchema>;
export type GenerationArtifactRef = z.infer<typeof generationArtifactRefSchema>;
export type GenerationJobResult = z.infer<typeof generationJobResultSchema>;
export type GenerationJobInput = z.infer<typeof generationJobInputSchema>;
export type GenerationJob = z.infer<typeof generationJobSchema>;

export interface CreateDocumentGenerationResponse {
  job: GenerationJob;
}

export interface GenerateQuizGenerationResponse {
  job: GenerationJob;
}
