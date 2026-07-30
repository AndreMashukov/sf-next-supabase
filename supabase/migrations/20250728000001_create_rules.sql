-- Rules table and document applied_rule_ids

CREATE TABLE IF NOT EXISTS public.rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    content text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rules_user_id ON public.rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_created_at ON public.rules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_is_default ON public.rules(user_id, is_default);

ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules"
    ON public.rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
    ON public.rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
    ON public.rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
    ON public.rules FOR DELETE
    USING (auth.uid() = user_id);

CREATE TRIGGER rules_updated_at
    BEFORE UPDATE ON public.rules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.rules TO authenticated;
GRANT ALL ON public.rules TO service_role;

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS applied_rule_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_documents_applied_rule_ids
    ON public.documents USING GIN (applied_rule_ids);
