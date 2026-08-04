import { describe, expect, it } from 'vitest';
import { jobMatchesDirectory, jobMatchesDocument, mapGenerationJobRow } from './generation-jobs';

describe('generation-jobs helpers', () => {
  it('maps database rows to generation jobs', () => {
    const job = mapGenerationJobRow({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '22222222-2222-4222-8222-222222222222',
      kind: 'document',
      status: 'pending',
      input: {
        title: 'Draft',
        directoryId: '33333333-3333-4333-8333-333333333333',
      },
      result: {},
      error_message: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      expires_at: null,
    });

    expect(job.input.title).toBe('Draft');
    expect(job.input.directoryId).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('matches jobs to directory and document scopes', () => {
    const documentJob = mapGenerationJobRow({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '22222222-2222-4222-8222-222222222222',
      kind: 'document',
      status: 'pending',
      input: { directoryId: '33333333-3333-4333-8333-333333333333' },
      result: {},
      error_message: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      expires_at: null,
    });

    const quizJob = mapGenerationJobRow({
      id: '44444444-4444-4444-8444-444444444444',
      user_id: '22222222-2222-4222-8222-222222222222',
      kind: 'quiz',
      status: 'pending',
      input: { documentId: '55555555-5555-4555-8555-555555555555' },
      result: {},
      error_message: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      expires_at: null,
    });

    expect(jobMatchesDirectory(documentJob, '33333333-3333-4333-8333-333333333333')).toBe(true);
    expect(jobMatchesDocument(quizJob, '55555555-5555-4555-8555-555555555555')).toBe(true);
  });
});
