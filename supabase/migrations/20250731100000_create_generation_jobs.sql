-- Generation jobs: ephemeral async status records for document/quiz generation

CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('document', 'quiz')),
    status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    result jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_status
    ON public.generation_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created_at
    ON public.generation_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_expires_at
    ON public.generation_jobs(expires_at)
    WHERE expires_at IS NOT NULL;

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation jobs"
    ON public.generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation jobs"
    ON public.generation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generation jobs"
    ON public.generation_jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generation jobs"
    ON public.generation_jobs FOR DELETE
    USING (auth.uid() = user_id);

CREATE TRIGGER generation_jobs_updated_at
    BEFORE UPDATE ON public.generation_jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
