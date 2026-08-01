-- Agent conversation threads and semantic memory

create table public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('workspace', 'directory')),
  directory_id uuid references public.directories (id) on delete set null,
  title text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_threads_user_id_idx on public.agent_threads (user_id);
create index agent_threads_user_scope_idx on public.agent_threads (user_id, scope);
create index agent_threads_last_message_at_idx on public.agent_threads (last_message_at desc);

alter table public.agent_threads enable row level security;

create policy "Users can select own agent threads"
  on public.agent_threads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own agent threads"
  on public.agent_threads
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own agent threads"
  on public.agent_threads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own agent threads"
  on public.agent_threads
  for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_agent_threads_updated_at
  before update on public.agent_threads
  for each row
  execute function public.set_updated_at();

create table public.agent_conversation_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid references public.agent_threads (id) on delete cascade,
  scope text not null check (scope in ('workspace', 'directory')),
  memory_type text not null check (
    memory_type in ('explicit', 'preference', 'fact', 'entity', 'instruction')
  ),
  content text not null,
  priority integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1024) not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_conversation_memories_user_id_idx on public.agent_conversation_memories (user_id);
create index agent_conversation_memories_thread_id_idx on public.agent_conversation_memories (thread_id);
create index agent_conversation_memories_scope_idx on public.agent_conversation_memories (user_id, scope);
create index agent_conversation_memories_priority_idx on public.agent_conversation_memories (priority desc);

create index agent_conversation_memories_embedding_idx
  on public.agent_conversation_memories
  using hnsw (embedding vector_cosine_ops);

alter table public.agent_conversation_memories enable row level security;

create policy "Users can select own agent memories"
  on public.agent_conversation_memories
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own agent memories"
  on public.agent_conversation_memories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own agent memories"
  on public.agent_conversation_memories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own agent memories"
  on public.agent_conversation_memories
  for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_agent_conversation_memories_updated_at
  before update on public.agent_conversation_memories
  for each row
  execute function public.set_updated_at();

create or replace function public.match_agent_memories(
  p_user_id uuid,
  p_query_embedding extensions.vector(1024),
  p_thread_id uuid default null,
  p_scope text default 'workspace',
  p_match_count int default 6
)
returns table (
  id uuid,
  thread_id uuid,
  memory_type text,
  content text,
  priority integer,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := coalesce(auth.uid(), p_user_id);
begin
  if v_user_id is null then
    raise exception 'match_agent_memories requires an authenticated user or p_user_id';
  end if;

  return query
  select
    m.id,
    m.thread_id,
    m.memory_type,
    m.content,
    m.priority,
    m.metadata,
    1 - (m.embedding <=> p_query_embedding) as similarity
  from public.agent_conversation_memories m
  where m.user_id = v_user_id
    and m.scope = p_scope
    and (m.expires_at is null or m.expires_at > now())
    and (
      p_thread_id is null
      or m.thread_id = p_thread_id
      or m.thread_id is null
    )
  order by m.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

grant execute on function public.match_agent_memories(uuid, extensions.vector(1024), uuid, text, int) to authenticated;
grant execute on function public.match_agent_memories(uuid, extensions.vector(1024), uuid, text, int) to service_role;

grant select, insert, update, delete on public.agent_threads to authenticated;
grant select, insert, update, delete on public.agent_threads to service_role;
grant select, insert, update, delete on public.agent_conversation_memories to authenticated;
grant select, insert, update, delete on public.agent_conversation_memories to service_role;
