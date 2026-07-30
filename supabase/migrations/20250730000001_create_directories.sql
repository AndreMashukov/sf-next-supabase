-- Directories, directory-rule attachments, and document placement

CREATE TABLE IF NOT EXISTS public.directories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES public.directories(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    path text NOT NULL,
    level integer NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 10),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT directories_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_directories_user_id ON public.directories(user_id);
CREATE INDEX IF NOT EXISTS idx_directories_parent_id ON public.directories(parent_id);
CREATE INDEX IF NOT EXISTS idx_directories_path ON public.directories(user_id, path);

CREATE UNIQUE INDEX IF NOT EXISTS idx_directories_root_name
    ON public.directories(user_id, name)
    WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_directories_child_name
    ON public.directories(user_id, parent_id, name)
    WHERE parent_id IS NOT NULL;

ALTER TABLE public.directories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own directories"
    ON public.directories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own directories"
    ON public.directories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own directories"
    ON public.directories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own directories"
    ON public.directories FOR DELETE
    USING (auth.uid() = user_id);

CREATE TRIGGER directories_updated_at
    BEFORE UPDATE ON public.directories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.directories TO authenticated;
GRANT ALL ON public.directories TO service_role;

CREATE TABLE IF NOT EXISTS public.directory_rules (
    directory_id uuid NOT NULL REFERENCES public.directories(id) ON DELETE CASCADE,
    rule_id uuid NOT NULL REFERENCES public.rules(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (directory_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_directory_rules_rule_id ON public.directory_rules(rule_id);

ALTER TABLE public.directory_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own directory rules"
    ON public.directory_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.directories d
            WHERE d.id = directory_rules.directory_id
              AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own directory rules"
    ON public.directory_rules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.directories d
            WHERE d.id = directory_rules.directory_id
              AND d.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.rules r
            WHERE r.id = directory_rules.rule_id
              AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own directory rules"
    ON public.directory_rules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.directories d
            WHERE d.id = directory_rules.directory_id
              AND d.user_id = auth.uid()
        )
    );

GRANT ALL ON public.directory_rules TO authenticated;
GRANT ALL ON public.directory_rules TO service_role;

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS directory_id uuid REFERENCES public.directories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_directory_id ON public.documents(directory_id);
