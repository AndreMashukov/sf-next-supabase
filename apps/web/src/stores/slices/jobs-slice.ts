import type { GenerationJob } from '@sf/shared-types';
import type { StateCreator } from 'zustand';
import type { UiStore } from '../ui-store';

export function upsertJob(jobs: GenerationJob[], nextJob: GenerationJob): GenerationJob[] {
  const existingIndex = jobs.findIndex((job) => job.id === nextJob.id);
  if (existingIndex === -1) {
    return [...jobs, nextJob];
  }

  const updated = [...jobs];
  updated[existingIndex] = nextJob;
  return updated;
}

export function areJobListsEqual(left: GenerationJob[], right: GenerationJob[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((job, index) => {
    const other = right[index];
    return (
      job.id === other.id &&
      job.status === other.status &&
      job.updatedAt === other.updatedAt &&
      job.errorMessage === other.errorMessage
    );
  });
}

/** Merge a bootstrap snapshot into the current list without dropping in-flight jobs. */
export function mergeBootstrapJobs(
  current: GenerationJob[],
  bootstrap: GenerationJob[],
): GenerationJob[] {
  let merged = current;
  for (const job of bootstrap) {
    merged = upsertJob(merged, job);
  }
  return merged;
}

export type JobsSlice = {
  generationJobs: GenerationJob[];
  upsertGenerationJob: (job: GenerationJob) => void;
  setGenerationJobs: (jobs: GenerationJob[]) => void;
  mergeGenerationJobs: (jobs: GenerationJob[]) => void;
};

export const createJobsSlice: StateCreator<UiStore, [], [], JobsSlice> = (set) => ({
  generationJobs: [],
  upsertGenerationJob: (job) => {
    if (!job?.id || !job.status) {
      return;
    }
    set((state) => ({
      generationJobs: upsertJob(state.generationJobs, job),
    }));
  },
  setGenerationJobs: (jobs) => {
    set((state) =>
      areJobListsEqual(state.generationJobs, jobs) ? state : { generationJobs: jobs },
    );
  },
  mergeGenerationJobs: (jobs) => {
    set((state) => {
      const merged = mergeBootstrapJobs(state.generationJobs, jobs);
      return areJobListsEqual(state.generationJobs, merged)
        ? state
        : { generationJobs: merged };
    });
  },
});
