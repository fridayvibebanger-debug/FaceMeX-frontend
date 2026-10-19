create table if not exists public.facemex_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.facemex_user_settings enable row level security;

grant select, insert, update on public.facemex_user_settings to authenticated;

drop policy if exists "Users read their FaceMeX settings" on public.facemex_user_settings;
create policy "Users read their FaceMeX settings"
on public.facemex_user_settings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users create their FaceMeX settings" on public.facemex_user_settings;
create policy "Users create their FaceMeX settings"
on public.facemex_user_settings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update their FaceMeX settings" on public.facemex_user_settings;
create policy "Users update their FaceMeX settings"
on public.facemex_user_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
