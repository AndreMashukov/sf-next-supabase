'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GenerationJob } from '@sf/shared-types';
import { createClient } from '@/lib/supabase/client';
import { subscribeGenerationJobStarted } from '@/lib/generation-job-events';
import {
  jobMatchesDirectory,
  jobMatchesDocument,
  mapGenerationJobRow,
  jobMatchesDocumentsInDirectory,
} from '@/lib/generation-jobs';

type JobChangeHandler = (job: GenerationJob) => void;

interface UseGenerationJobsRealtimeOptions {
  directoryId?: string;
  documentId?: string;
  documentIds?: string[];
  onCompleted?: JobChangeHandler;
  onFailed?: JobChangeHandler;
}

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

export function useGenerationJobsRealtime(options: UseGenerationJobsRealtimeOptions = {}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const { directoryId, documentId, documentIds, onCompleted, onFailed } = options;

  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  onCompletedRef.current = onCompleted;
  onFailedRef.current = onFailed;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function mergeJob(nextJob: GenerationJob) {
      setJobs((current) => upsertJob(current, nextJob));

      if (nextJob.status === 'completed') {
        onCompletedRef.current?.(nextJob);
        router.refresh();
        return;
      }

      if (nextJob.status === 'failed') {
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
        setJobs((current) => (areJobListsEqual(current, mapped) ? current : mapped));
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
  }, [router]);

  const pendingJobs = useMemo(
    () => jobs.filter((job) => Boolean(job?.id) && job.status === 'pending'),
    [jobs],
  );

  const scopedPendingJobs = useMemo(() => {
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
  }, [pendingJobs, directoryId, documentId, documentIds]);

  const registerJob = useCallback((job: GenerationJob) => {
    if (!job?.id || !job.status) {
      return;
    }
    setJobs((current) => upsertJob(current, job));
  }, []);

  return {
    jobs,
    pendingJobs,
    scopedPendingJobs,
    registerJob,
  };
}
