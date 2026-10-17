create extension if not exists pgcrypto;

create table if not exists public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_projects_id_user_id_unique unique (id, user_id)
);

create table if not exists public.workspace_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.workspace_projects(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) <= 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_conversations_project_owner_fk
    foreign key (project_id, user_id)
    references public.workspace_projects(id, user_id)
    on delete cascade
);

create table if not exists public.workspace_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.workspace_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  document_key text not null,
  title text not null default 'Untitled document' check (char_length(title) between 1 and 160),
  document_type text not null default 'cv',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_project_owner_fk
    foreign key (project_id, user_id)
    references public.workspace_projects(id, user_id)
    on delete set null (project_id),
  constraint documents_user_document_key_unique unique (user_id, document_key)
);

create index if not exists workspace_projects_user_updated_idx
  on public.workspace_projects (user_id, updated_at desc);
create index if not exists workspace_conversations_user_updated_idx
  on public.workspace_conversations (user_id, updated_at desc);
create index if not exists workspace_conversations_project_updated_idx
  on public.workspace_conversations (project_id, updated_at desc);
create index if not exists workspace_messages_conversation_created_idx
  on public.workspace_messages (conversation_id, created_at);
create index if not exists documents_user_updated_idx
  on public.documents (user_id, updated_at desc);
create index if not exists documents_project_updated_idx
  on public.documents (project_id, updated_at desc)
  where project_id is not null;

create or replace function public.set_facemex_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_projects_set_updated_at on public.workspace_projects;
create trigger workspace_projects_set_updated_at
before update on public.workspace_projects
for each row execute function public.set_facemex_workspace_updated_at();

drop trigger if exists workspace_conversations_set_updated_at on public.workspace_conversations;
create trigger workspace_conversations_set_updated_at
before update on public.workspace_conversations
for each row execute function public.set_facemex_workspace_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_facemex_workspace_updated_at();

alter table public.workspace_projects enable row level security;
alter table public.workspace_conversations enable row level security;
alter table public.workspace_messages enable row level security;
alter table public.documents enable row level security;

grant select, insert, update, delete on public.workspace_projects to authenticated;
grant select, insert, update, delete on public.workspace_conversations to authenticated;
grant select, insert, update, delete on public.workspace_messages to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

drop policy if exists "Users manage their workspace projects" on public.workspace_projects;
create policy "Users manage their workspace projects"
on public.workspace_projects for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage their workspace conversations" on public.workspace_conversations;
create policy "Users manage their workspace conversations"
on public.workspace_conversations for all to authenticated
using (
  user_id = auth.uid()
  and (project_id is null or exists (
    select 1 from public.workspace_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ))
)
with check (
  user_id = auth.uid()
  and (project_id is null or exists (
    select 1 from public.workspace_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ))
);

drop policy if exists "Users manage messages in their workspace conversations" on public.workspace_messages;
create policy "Users manage messages in their workspace conversations"
on public.workspace_messages for all to authenticated
using (exists (
  select 1 from public.workspace_conversations c
  where c.id = conversation_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.workspace_conversations c
  where c.id = conversation_id and c.user_id = auth.uid()
));

drop policy if exists "Users manage their documents" on public.documents;
create policy "Users manage their documents"
on public.documents for all to authenticated
using (
  user_id = auth.uid()
  and (project_id is null or exists (
    select 1 from public.workspace_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ))
)
with check (
  user_id = auth.uid()
  and (project_id is null or exists (
    select 1 from public.workspace_projects p
    where p.id = project_id and p.user_id = auth.uid()
  ))
);

-- The existing facemex-files bucket is retained. Objects use user-owned paths:
-- <user_id>/projects/<project_id>/{files,images,documents}/...
-- <user_id>/conversations/<conversation_id>/images/...
drop policy if exists "FaceMeX users read owned workspace files" on storage.objects;
create policy "FaceMeX users read owned workspace files"
on storage.objects for select to authenticated
using (
  bucket_id = 'facemex-files'
  and split_part(name, '/', 1) = auth.uid()::text
  and (
    (split_part(name, '/', 2) = 'projects' and exists (
      select 1 from public.workspace_projects p
      where p.id::text = split_part(name, '/', 3) and p.user_id = auth.uid()
    ))
    or
    (split_part(name, '/', 2) = 'conversations' and exists (
      select 1 from public.workspace_conversations c
      where c.id::text = split_part(name, '/', 3) and c.user_id = auth.uid()
    ))
  )
);

drop policy if exists "FaceMeX users upload owned workspace files" on storage.objects;
create policy "FaceMeX users upload owned workspace files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'facemex-files'
  and split_part(name, '/', 1) = auth.uid()::text
  and (
    (split_part(name, '/', 2) = 'projects' and exists (
      select 1 from public.workspace_projects p
      where p.id::text = split_part(name, '/', 3) and p.user_id = auth.uid()
    ))
    or
    (split_part(name, '/', 2) = 'conversations' and exists (
      select 1 from public.workspace_conversations c
      where c.id::text = split_part(name, '/', 3) and c.user_id = auth.uid()
    ))
  )
);

drop policy if exists "FaceMeX users update owned workspace files" on storage.objects;
create policy "FaceMeX users update owned workspace files"
on storage.objects for update to authenticated
using (
  bucket_id = 'facemex-files'
  and split_part(name, '/', 1) = auth.uid()::text
  and (
    (split_part(name, '/', 2) = 'projects' and exists (
      select 1 from public.workspace_projects p
      where p.id::text = split_part(name, '/', 3) and p.user_id = auth.uid()
    ))
    or
    (split_part(name, '/', 2) = 'conversations' and exists (
      select 1 from public.workspace_conversations c
      where c.id::text = split_part(name, '/', 3) and c.user_id = auth.uid()
    ))
  )
)
with check (
  bucket_id = 'facemex-files'
  and split_part(name, '/', 1) = auth.uid()::text
  and (
    (split_part(name, '/', 2) = 'projects' and exists (
      select 1 from public.workspace_projects p
      where p.id::text = split_part(name, '/', 3) and p.user_id = auth.uid()
    ))
    or
    (split_part(name, '/', 2) = 'conversations' and exists (
      select 1 from public.workspace_conversations c
      where c.id::text = split_part(name, '/', 3) and c.user_id = auth.uid()
    ))
  )
);

drop policy if exists "FaceMeX users delete owned workspace files" on storage.objects;
create policy "FaceMeX users delete owned workspace files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'facemex-files'
  and split_part(name, '/', 1) = auth.uid()::text
  and (
    (split_part(name, '/', 2) = 'projects' and exists (
      select 1 from public.workspace_projects p
      where p.id::text = split_part(name, '/', 3) and p.user_id = auth.uid()
    ))
    or
    (split_part(name, '/', 2) = 'conversations' and exists (
      select 1 from public.workspace_conversations c
      where c.id::text = split_part(name, '/', 3) and c.user_id = auth.uid()
    ))
  )
);

notify pgrst, 'reload schema';
