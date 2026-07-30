-- Directory presentation fields (icon + color) for folder cards

ALTER TABLE public.directories
    ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#8b5cf6',
    ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'Folder';

-- Backfill any rows that might have empty values
UPDATE public.directories
SET
    color = COALESCE(NULLIF(trim(color), ''), '#8b5cf6'),
    icon = COALESCE(NULLIF(trim(icon), ''), 'Folder')
WHERE color IS NULL OR icon IS NULL OR trim(color) = '' OR trim(icon) = '';
