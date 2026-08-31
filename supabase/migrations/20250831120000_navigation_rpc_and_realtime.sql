-- Navigation RPC and Realtime publication for user-owned tables

CREATE OR REPLACE FUNCTION public.get_navigation_tree()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN jsonb_build_object(
    'directories',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'user_id', d.user_id,
            'parent_id', d.parent_id,
            'name', d.name,
            'description', d.description,
            'path', d.path,
            'level', d.level,
            'color', d.color,
            'icon', d.icon,
            'created_at', d.created_at,
            'updated_at', d.updated_at
          )
          ORDER BY d.path ASC
        )
        FROM public.directories d
        WHERE d.user_id = v_uid
      ),
      '[]'::jsonb
    ),
    'documents',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', doc.id,
            'title', doc.title,
            'directory_id', doc.directory_id
          )
          ORDER BY doc.created_at DESC
        )
        FROM public.documents doc
        WHERE doc.user_id = v_uid
      ),
      '[]'::jsonb
    ),
    'quizzes',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'title', q.title,
            'document_id', q.document_id
          )
          ORDER BY q.created_at DESC
        )
        FROM public.quizzes q
        WHERE q.user_id = v_uid
      ),
      '[]'::jsonb
    ),
    'directory_rules',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'directory_id', dr.directory_id,
            'rule_id', dr.rule_id
          )
        )
        FROM public.directory_rules dr
        INNER JOIN public.directories d ON d.id = dr.directory_id
        WHERE d.user_id = v_uid
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_navigation_tree() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_navigation_tree() TO authenticated;

ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.directories REPLICA IDENTITY FULL;
ALTER TABLE public.quizzes REPLICA IDENTITY FULL;
ALTER TABLE public.rules REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'directories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.directories;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'quizzes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rules;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'directory_rules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.directory_rules;
  END IF;
END $$;
