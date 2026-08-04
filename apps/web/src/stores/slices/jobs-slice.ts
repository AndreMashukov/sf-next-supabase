import type { GenerationJob } from '@sf/shared-types';
import type { StateCreator } from 'zustand';
import type { UiStore } from '../ui-store';

function upsertJob(jobs: GenerationJob[], nextJob: GenerationJob): GenerationJob[] {
  const existingIndex = jobs.findIndex((job) => job.id === nextJob.id);
  if (existingIndex === -1) {
    return [...jobs, nextJob];
  }

  const updated = [...jobs];
  updated[existingIndex] = nextJob;
  return updated;
}

function areJobListsEqual(left: GenerationJob[], right: GenerationJob[]): boolean {
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

export type JobsSlice = {
  generationJobs: GenerationJob[];
  upsertGenerationJob: (job: GenerationJob) => void;
  setGenerationJobs: (jobs: GenerationJob[]) => void;
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
});
