export const GENERATION_JOB_STARTED_EVENT = 'sf:generation-job-started';

export type GenerationJobStartedDetail = {
  jobId: string;
};

export function emitGenerationJobStarted(jobId: string): void {
  if (typeof window === 'undefined' || !jobId) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<GenerationJobStartedDetail>(GENERATION_JOB_STARTED_EVENT, {
      detail: { jobId },
    }),
  );
}

export function subscribeGenerationJobStarted(
  handler: (jobId: string) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<GenerationJobStartedDetail>;
    const jobId = customEvent.detail?.jobId;
    if (jobId) {
      handler(jobId);
    }
  };

  window.addEventListener(GENERATION_JOB_STARTED_EVENT, listener);
  return () => window.removeEventListener(GENERATION_JOB_STARTED_EVENT, listener);
}
