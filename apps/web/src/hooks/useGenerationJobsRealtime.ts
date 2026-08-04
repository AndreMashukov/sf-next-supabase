'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import type { GenerationJob } from '@sf/shared-types';
import { useUiStore, useUiStoreApi } from '@/providers/ui-store-provider';
import { createClient } from '@/supabase/client';
import { subscribeGenerationJobStarted } from '@/jobs/generation-job-events';
import {
  jobMatchesDirectory,
  jobMatchesDocument,
  mapGenerationJobRow,
  jobMatchesDocumentsInDirectory,
} from '@/jobs/generation-jobs';

type JobChangeHandler = (job: GenerationJob) => void;

interface UseGenerationJobsRealtimeOptions {
  directoryId?: string;
  documentId?: string;
  documentIds?: string[];
  onCompleted?: JobChangeHandler;
  onFailed?: JobChangeHandler;
}

function selectScopedPendingJobs(
  jobs: GenerationJob[],
  options: Pick<UseGenerationJobsRealtimeOptions, 'directoryId' | 'documentId' | 'documentIds'>,
): GenerationJob[] {
  const pendingJobs = jobs.filter((job) => Boolean(job?.id) && job.status === 'pending');
  const { directoryId, documentId, documentIds } = options;

  return pendingJobs.filter((job) => {
    if (directoryId && jobMatchesDirectory(job, directoryId)) {
      return true;
    }

    if (documentId && jobMatchesDocument(job, documentId)) {
      return true;
    }

    if (documentIds?.length && jobMatchesDocumentsInDirectory(job, documentIds)) {
      return true;
    }

    if (!directoryId && !documentId && !documentIds?.length) {
      return true;
    }

    return false;
  });
}

export function useGenerationJobsRealtime(options: UseGenerationJobsRealtimeOptions = {}) {
  const router = useRouter();
  const store = useUiStoreApi();
  const { directoryId, documentId, documentIds, onCompleted, onFailed } = options;

  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  // Keep callback refs in sync after commit so discarded concurrent renders
  // cannot overwrite them with uncommitted values.
  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  }, [onCompleted, onFailed]);

  const jobs = useUiStore((state) => state.generationJobs);
  const upsertGenerationJob = useUiStore((state) => state.upsertGenerationJob);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function mergeJob(nextJob: GenerationJob) {
      const previous = store.getState().generationJobs.find((job) => job.id === nextJob.id);
      store.getState().upsertGenerationJob(nextJob);

      if (nextJob.status === 'completed' && previous?.status !== 'completed') {
        onCompletedRef.current?.(nextJob);
        router.refresh();
        return;
      }

      if (nextJob.status === 'failed' && previous?.status !== 'failed') {
        onFailedRef.current?.(nextJob);
      }
    }

    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load pending generation jobs', error);
      } else if (!cancelled && data) {
        const mapped = data.map((row) => mapGenerationJobRow(row));
        // Merge so jobs registered/loaded while the query was in flight are kept.
        store.getState().mergeGenerationJobs(mapped);
      }

      if (cancelled) {
        return;
      }

      channel = supabase
        .channel(`generation-jobs-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'generation_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              mergeJob(mapGenerationJobRow(payload.new));
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'generation_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              mergeJob(mapGenerationJobRow(payload.new));
            }
          },
        )
        .subscribe();
    }

    async function loadJobById(jobId: string) {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load generation job', jobId, error);
        return;
      }

      if (!cancelled && data) {
        mergeJob(mapGenerationJobRow(data));
      }
    }

    const unsubscribeJobStarted = subscribeGenerationJobStarted((jobId) => {
      void loadJobById(jobId);
    });

    void bootstrap();

    return () => {
      cancelled = true;
      unsubscribeJobStarted();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router, store]);

  const pendingJobs = useMemo(
    () => jobs.filter((job) => Boolean(job?.id) && job.status === 'pending'),
    [jobs],
  );

  const scopedPendingJobs = useUiStore(
    useShallow((state) =>
      selectScopedPendingJobs(state.generationJobs, {
        directoryId,
        documentId,
        documentIds,
      }),
    ),
  );

  const registerJob = useCallback(
    (job: GenerationJob) => {
      upsertGenerationJob(job);
    },
    [upsertGenerationJob],
  );

  return {
    jobs,
    pendingJobs,
    scopedPendingJobs,
    registerJob,
  };
}
