-- Create Supabase Storage bucket for document HTML files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  5242880,
  ARRAY['text/html']
)
ON CONFLICT (id) DO NOTHING;
