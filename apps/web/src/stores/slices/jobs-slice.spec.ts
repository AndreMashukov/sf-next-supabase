import { describe, expect, it } from 'vitest';
import type { GenerationJob } from '@sf/shared-types';
import { createUiStore } from '../ui-store';
import { mergeBootstrapJobs } from './jobs-slice';

function makeJob(overrides: Partial<GenerationJob> & Pick<GenerationJob, 'id'>): GenerationJob {
  return {
    userId: 'user-1',
    kind: 'document',
    status: 'pending',
    input: {},
    result: {},
    errorMessage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    expiresAt: null,
    ...overrides,
  };
}

describe('mergeBootstrapJobs', () => {
  it('keeps jobs registered while the bootstrap query is in flight', () => {
    const registeredBeforeBootstrap = makeJob({
      id: 'optimistic-job',
      updatedAt: '2026-01-01T00:00:05.000Z',
    });
    const bootstrapJobs = [
      makeJob({ id: 'server-job-a' }),
      makeJob({ id: 'server-job-b' }),
    ];

    const merged = mergeBootstrapJobs([registeredBeforeBootstrap], bootstrapJobs);

    expect(merged.map((job) => job.id).sort()).toEqual([
      'optimistic-job',
      'server-job-a',
      'server-job-b',
    ]);
  });

  it('updates overlapping jobs from the bootstrap snapshot', () => {
    const current = [
      makeJob({
        id: 'shared-job',
        status: 'pending',
        updatedAt: '2026-01-01T00:00:01.000Z',
      }),
    ];
    const bootstrapJobs = [
      makeJob({
        id: 'shared-job',
        status: 'pending',
        updatedAt: '2026-01-01T00:00:10.000Z',
        errorMessage: null,
      }),
    ];

    const merged = mergeBootstrapJobs(current, bootstrapJobs);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.updatedAt).toBe('2026-01-01T00:00:10.000Z');
  });
});

describe('jobs slice mergeGenerationJobs', () => {
  it('preserves registerJob results when bootstrap merges later', () => {
    const store = createUiStore();
    const registered = makeJob({ id: 'race-job' });

    store.getState().upsertGenerationJob(registered);
    store.getState().mergeGenerationJobs([
      makeJob({ id: 'bootstrapped-job' }),
    ]);

    const ids = store.getState().generationJobs.map((job) => job.id).sort();
    expect(ids).toEqual(['bootstrapped-job', 'race-job']);
  });
});
