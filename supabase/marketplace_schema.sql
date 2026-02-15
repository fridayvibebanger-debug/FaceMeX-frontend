create table if not exists public.marketplace_businesses (
  id text primary key,
  name text not null,
  website_url text not null,
  description text not null,
  tier text not null default 'exclusive',
  is_demo boolean not null default false,
  assets jsonb not null default '[]'::jsonb,
  featured_rank integer not null default 50,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_businesses_featured_rank_idx
  on public.marketplace_businesses (featured_rank asc);

alter table public.marketplace_businesses enable row level security;

-- Serverless functions use the Service Role key, so RLS policies are optional.
-- If you want client-side read access later, add a public select policy.

create table if not exists public.marketplace_ads (
  id text primary key,
  creator_id text not null,
  creator_tier text not null,
  title text not null,
  description text not null,
  website_url text,
  media jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists marketplace_ads_created_at_idx
  on public.marketplace_ads (created_at desc);

alter table public.marketplace_ads enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  tier text not null default 'free',
  professional jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'tier', 'free')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
