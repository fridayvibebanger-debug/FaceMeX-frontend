create table if not exists public.facemex_screen_share_sessions (
  id uuid primary key,
  room_name text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  host_name text not null default 'FaceMeX user',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'ended')),
  invitation_revoked boolean not null default false,
  started_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.facemex_screen_share_participants (
  session_id uuid not null references public.facemex_screen_share_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'FaceMeX user',
  status text not null default 'waiting'
    check (status in ('waiting', 'approved', 'rejected', 'removed')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  primary key (session_id, user_id)
);

create index if not exists facemex_screen_share_host_created_idx
  on public.facemex_screen_share_sessions (host_id, created_at desc);

create index if not exists facemex_screen_share_expiry_idx
  on public.facemex_screen_share_sessions (expires_at);

create index if not exists facemex_screen_share_participant_status_idx
  on public.facemex_screen_share_participants (session_id, status);

alter table public.facemex_screen_share_sessions enable row level security;
alter table public.facemex_screen_share_participants enable row level security;

revoke all on public.facemex_screen_share_sessions from anon, authenticated;
revoke all on public.facemex_screen_share_participants from anon, authenticated;
grant all on public.facemex_screen_share_sessions to service_role;
grant all on public.facemex_screen_share_participants to service_role;
