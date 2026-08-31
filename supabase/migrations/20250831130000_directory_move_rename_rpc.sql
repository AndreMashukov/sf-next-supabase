-- Atomic directory move and rename operations for browser mutations

CREATE OR REPLACE FUNCTION public.directory_path_level(p_path text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN trim(both '/' FROM p_path) = '' THEN -1
    ELSE array_length(string_to_array(trim(both '/' FROM p_path), '/'), 1) - 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.move_directory(
  p_directory_id uuid,
  p_parent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dir public.directories%ROWTYPE;
  v_parent public.directories%ROWTYPE;
  v_next_level integer;
  v_subtree_depth integer;
  v_new_path text;
  v_old_path text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT * INTO v_dir
  FROM public.directories
  WHERE id = p_directory_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Directory not found';
  END IF;

  IF p_parent_id = p_directory_id THEN
    RAISE EXCEPTION 'A directory cannot be moved into itself';
  END IF;

  IF p_parent_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id
        FROM public.directories
        WHERE id = p_parent_id AND user_id = v_uid
        UNION ALL
        SELECT d.id, d.parent_id
        FROM public.directories d
        INNER JOIN ancestors a ON d.id = a.parent_id
        WHERE d.user_id = v_uid
      )
      SELECT 1 FROM ancestors WHERE id = p_directory_id
    ) THEN
      RAISE EXCEPTION 'A directory cannot be moved into its own descendant';
    END IF;

    SELECT * INTO v_parent
    FROM public.directories
    WHERE id = p_parent_id AND user_id = v_uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Directory not found';
    END IF;

    v_next_level := v_parent.level + 1;
    v_new_path := v_parent.path || '/' || v_dir.name;
  ELSE
    v_next_level := 0;
    v_new_path := '/' || v_dir.name;
  END IF;

  IF v_next_level > 10 THEN
    RAISE EXCEPTION 'Directory depth cannot exceed 10';
  END IF;

  SELECT COALESCE(MAX(level - v_dir.level), 0)
  INTO v_subtree_depth
  FROM public.directories
  WHERE user_id = v_uid
    AND (id = v_dir.id OR path LIKE v_dir.path || '/%');

  IF v_next_level + v_subtree_depth > 10 THEN
    RAISE EXCEPTION 'Moving this directory would exceed the maximum depth';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.directories
    WHERE user_id = v_uid
      AND parent_id IS NOT DISTINCT FROM p_parent_id
      AND lower(name) = lower(v_dir.name)
      AND id <> v_dir.id
  ) THEN
    RAISE EXCEPTION 'A directory with this name already exists in the target location';
  END IF;

  v_old_path := v_dir.path;

  UPDATE public.directories
  SET
    parent_id = p_parent_id,
    level = v_next_level,
    path = v_new_path
  WHERE id = p_directory_id AND user_id = v_uid;

  UPDATE public.directories d
  SET
    path = v_new_path || substring(d.path FROM length(v_old_path) + 1),
    level = public.directory_path_level(
      v_new_path || substring(d.path FROM length(v_old_path) + 1)
    )
  WHERE user_id = v_uid
    AND d.path LIKE v_old_path || '/%';

  RETURN (
    SELECT to_jsonb(d)
    FROM public.directories d
    WHERE d.id = p_directory_id AND d.user_id = v_uid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_directory(
  p_directory_id uuid,
  p_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dir public.directories%ROWTYPE;
  v_parent_path text;
  v_new_path text;
  v_old_path text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT * INTO v_dir
  FROM public.directories
  WHERE id = p_directory_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Directory not found';
  END IF;

  IF p_name = v_dir.name THEN
    RETURN to_jsonb(v_dir);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.directories
    WHERE user_id = v_uid
      AND parent_id IS NOT DISTINCT FROM v_dir.parent_id
      AND lower(name) = lower(p_name)
      AND id <> v_dir.id
  ) THEN
    RAISE EXCEPTION 'A directory with this name already exists in the target location';
  END IF;

  IF v_dir.parent_id IS NULL THEN
    v_parent_path := NULL;
    v_new_path := '/' || p_name;
  ELSE
    SELECT path INTO v_parent_path
    FROM public.directories
    WHERE id = v_dir.parent_id AND user_id = v_uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Directory not found';
    END IF;

    v_new_path := v_parent_path || '/' || p_name;
  END IF;

  v_old_path := v_dir.path;

  UPDATE public.directories
  SET name = p_name, path = v_new_path
  WHERE id = p_directory_id AND user_id = v_uid;

  UPDATE public.directories d
  SET
    path = v_new_path || substring(d.path FROM length(v_old_path) + 1),
    level = public.directory_path_level(
      v_new_path || substring(d.path FROM length(v_old_path) + 1)
    )
  WHERE user_id = v_uid
    AND d.path LIKE v_old_path || '/%';

  RETURN (
    SELECT to_jsonb(d)
    FROM public.directories d
    WHERE d.id = p_directory_id AND d.user_id = v_uid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.directory_path_level(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.move_directory(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rename_directory(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.directory_path_level(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_directory(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_directory(uuid, text) TO authenticated;
