alter table public.facemex_screen_share_participants
  add column if not exists is_guest boolean not null default false;
