-- Enable pgvector for RAG embeddings
create extension if not exists vector with schema extensions;

create table public.agent_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  directory_id uuid references public.directories (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete cascade,
  source_type text not null check (source_type in ('directory', 'document', 'quiz')),
  source_title text not null default '',
  chunk_index integer not null default 0,
  content text not null,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_knowledge_chunks_user_id_idx on public.agent_knowledge_chunks (user_id);
create index agent_knowledge_chunks_directory_id_idx on public.agent_knowledge_chunks (directory_id);
create index agent_knowledge_chunks_document_id_idx on public.agent_knowledge_chunks (document_id);
create index agent_knowledge_chunks_quiz_id_idx on public.agent_knowledge_chunks (quiz_id);
create index agent_knowledge_chunks_content_hash_idx on public.agent_knowledge_chunks (content_hash);

create index agent_knowledge_chunks_embedding_idx
  on public.agent_knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.agent_knowledge_chunks enable row level security;

create policy "Users can select own agent chunks"
  on public.agent_knowledge_chunks
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own agent chunks"
  on public.agent_knowledge_chunks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own agent chunks"
  on public.agent_knowledge_chunks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own agent chunks"
  on public.agent_knowledge_chunks
  for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_agent_knowledge_chunks_updated_at
  before update on public.agent_knowledge_chunks
  for each row
  execute function public.set_updated_at();

create or replace function public.match_agent_chunks(
  p_user_id uuid,
  p_directory_ids uuid[],
  p_query_embedding extensions.vector(1024),
  p_match_count int default 8
)
returns table (
  id uuid,
  source_type text,
  source_title text,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    c.id,
    c.source_type,
    c.source_title,
    c.content,
    c.metadata,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.agent_knowledge_chunks c
  where c.user_id = p_user_id
    and (
      c.directory_id = any (p_directory_ids)
      or c.directory_id is null
    )
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

grant execute on function public.match_agent_chunks(uuid, uuid[], extensions.vector(1024), int) to authenticated;
grant execute on function public.match_agent_chunks(uuid, uuid[], extensions.vector(1024), int) to service_role;

grant all on public.agent_knowledge_chunks to authenticated;
grant all on public.agent_knowledge_chunks to service_role;
