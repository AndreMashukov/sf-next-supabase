import type { GenerationJob, GenerationJobInput, GenerationJobResult } from '@sf/shared-types';

type GenerationJobRow = {
  id: string;
  user_id: string;
  kind: string;
  status: string;
  input: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string | null;
};

function parseGenerationJobInput(value: Record<string, unknown> | null): GenerationJobInput {
  if (!value) {
    return {};
  }

  return {
    title: typeof value.title === 'string' ? value.title : undefined,
    text: typeof value.text === 'string' ? value.text : undefined,
    ruleIds: Array.isArray(value.ruleIds)
      ? value.ruleIds.filter((id): id is string => typeof id === 'string')
      : undefined,
    directoryId: typeof value.directoryId === 'string' ? value.directoryId : undefined,
    documentId: typeof value.documentId === 'string' ? value.documentId : undefined,
    questionCount: typeof value.questionCount === 'number' ? value.questionCount : undefined,
  };
}

function parseGenerationJobResult(value: Record<string, unknown> | null): GenerationJobResult {
  if (!value) {
    return {};
  }

  const primaryArtifact = value.primaryArtifact;
  const artifacts = value.artifacts;

  return {
    primaryArtifact:
      primaryArtifact &&
      typeof primaryArtifact === 'object' &&
      primaryArtifact !== null &&
      'type' in primaryArtifact &&
      'id' in primaryArtifact
        ? {
            type: String((primaryArtifact as { type: string }).type) as 'document' | 'quiz',
            id: String((primaryArtifact as { id: string }).id),
          }
        : undefined,
    artifacts: Array.isArray(artifacts)
      ? artifacts
          .filter(
            (item): item is { type: string; id: string } =>
              typeof item === 'object' && item !== null && 'type' in item && 'id' in item,
          )
          .map((item) => ({
            type: String(item.type) as 'document' | 'quiz',
            id: String(item.id),
          }))
      : undefined,
  };
}

export function mapGenerationJobRow(row: GenerationJobRow): GenerationJob {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as GenerationJob['kind'],
    status: row.status as GenerationJob['status'],
    input: parseGenerationJobInput(row.input),
    result: parseGenerationJobResult(row.result),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
  };
}

export function jobMatchesDirectory(job: GenerationJob, directoryId: string): boolean {
  return job.kind === 'document' && job.input.directoryId === directoryId;
}

export function jobMatchesDocument(job: GenerationJob, documentId: string): boolean {
  return job.kind === 'quiz' && job.input.documentId === documentId;
}

export function jobMatchesDocumentsInDirectory(
  job: GenerationJob,
  documentIds: string[],
): boolean {
  return job.kind === 'quiz' && Boolean(job.input.documentId && documentIds.includes(job.input.documentId));
}

export function getPendingJobLabel(job: GenerationJob): string {
  if (job.kind === 'document') {
    return job.input.title?.trim() || 'Generating document';
  }

  return job.input.title?.trim() || 'Generating quiz';
}
