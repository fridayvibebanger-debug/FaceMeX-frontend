
create table if not exists public.facemex_product_events (
  event_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name ~ '^[A-Za-z][A-Za-z0-9_]{0,39}$'),
  feature text,
  button_id text,
  action text,
  route text,
  device_category text not null check (device_category in ('mobile', 'tablet', 'desktop')),
  outcome text check (outcome in ('started', 'success', 'failure')),
  error_category text check (error_category in ('network', 'permission', 'validation', 'provider', 'server', 'unknown')),
  duration_ms integer check (duration_ms between 0 and 3600000),
  app_version text,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  occurred_at timestamptz not null default now()
);

create index if not exists facemex_product_events_occurred_at_idx
  on public.facemex_product_events (occurred_at desc);

create index if not exists facemex_product_events_feature_occurred_at_idx
  on public.facemex_product_events (feature, occurred_at desc);

create index if not exists facemex_product_events_user_occurred_at_idx
  on public.facemex_product_events (user_id, occurred_at desc);

create index if not exists facemex_product_events_name_occurred_at_idx
  on public.facemex_product_events (event_name, occurred_at desc);

alter table public.facemex_product_events enable row level security;

revoke all on public.facemex_product_events from public, anon, authenticated;

grant insert, select, update, delete
  on public.facemex_product_events to service_role;


create or replace function public.facemex_analytics_report(
  p_start_date date,
  p_end_date date,
  p_feature text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  report jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if p_start_date is null
    or p_end_date is null
    or p_start_date > p_end_date
    or p_end_date - p_start_date > 365
  then
    raise exception 'invalid analytics report range';
  end if;

  with range_events as (
    select *
    from public.facemex_product_events
    where occurred_at >= p_start_date::timestamptz
      and occurred_at < (p_end_date + 1)::timestamptz
      and (p_feature is null or feature = p_feature)
  ),

  recent_window_events as (
    select *
    from public.facemex_product_events
    where occurred_at >= (p_end_date - 29)::timestamptz
      and occurred_at < (p_end_date + 1)::timestamptz
      and (p_feature is null or feature = p_feature)
  ),

  first_visits as (
    select
      user_id,
      min(occurred_at::date) as first_day
    from public.facemex_product_events
    where occurred_at < (p_end_date + 1)::timestamptz
      and (p_feature is null or feature = p_feature)
    group by user_id
  ),

  retention_rows as (
    select
      first_visits.user_id,
      first_visits.first_day,

      exists (
        select 1
        from public.facemex_product_events e
        where e.user_id = first_visits.user_id
          and e.occurred_at >= (first_visits.first_day + interval '1 day')
          and e.occurred_at < (first_visits.first_day + interval '2 days')
          and (p_feature is null or e.feature = p_feature)
      ) as returned_day_1,

      exists (
        select 1
        from public.facemex_product_events e
        where e.user_id = first_visits.user_id
          and e.occurred_at >= (first_visits.first_day + interval '7 days')
          and e.occurred_at < (first_visits.first_day + interval '8 days')
          and (p_feature is null or e.feature = p_feature)
      ) as returned_day_7,

      exists (
        select 1
        from public.facemex_product_events e
        where e.user_id = first_visits.user_id
          and e.occurred_at >= (first_visits.first_day + interval '30 days')
          and e.occurred_at < (first_visits.first_day + interval '31 days')
          and (p_feature is null or e.feature = p_feature)
      ) as returned_day_30

    from first_visits
  ),

  daily_events as (
    select
      occurred_at::date as day,
      count(*) as event_count,
      count(distinct user_id) as unique_users
    from range_events
    group by occurred_at::date
  ),

  daily_signups as (
    select
      created_at::date as day,
      count(*) as signups
    from auth.users
    where created_at >= p_start_date::timestamptz
      and created_at < (p_end_date + 1)::timestamptz
    group by created_at::date
  ),

  feature_usage as (
    select
      feature,
      count(*) as event_count,
      count(distinct user_id) as unique_users
    from range_events
    where feature is not null
    group by feature
  ),

  button_usage as (
    select
      button_id,
      count(*) as event_count,
      count(distinct user_id) as unique_users
    from range_events
    where button_id is not null
    group by button_id
  ),

  device_usage as (
    select
      device_category,
      count(*) as event_count,
      count(distinct user_id) as unique_users
    from range_events
    group by device_category
  ),

  user_usage as (
    select
      user_id,
      count(*) as event_count,
      count(distinct feature) as features_used,
      max(occurred_at) as last_seen
    from range_events
    group by user_id
  )

  select jsonb_build_object(

    'overview', jsonb_build_object(
      'registered_users', (
        select count(*)
        from auth.users
      ),

      'active_users_in_range', (
        select count(distinct user_id)
        from range_events
      ),

      'daily_active_users', (
        select count(distinct user_id)
        from recent_window_events
        where occurred_at >= p_end_date::timestamptz
      ),

      'weekly_active_users', (
        select count(distinct user_id)
        from recent_window_events
        where occurred_at >= (p_end_date - 6)::timestamptz
      ),

      'monthly_active_users', (
        select count(distinct user_id)
        from recent_window_events
      ),

      'returning_users_in_range', (
        select count(*)
        from (
          select user_id
          from range_events
          group by user_id
          having count(distinct occurred_at::date) > 1
        ) returning_users
      ),

      'event_count', (
        select count(*)
        from range_events
      ),

      'page_views', (
        select count(*)
        from range_events
        where event_name = 'page_view'
      ),

      'app_opens', (
        select count(*)
        from range_events
        where event_name = 'app_open'
      ),

      'new_signups', (
        select count(*)
        from auth.users
        where created_at >= p_start_date::timestamptz
          and created_at < (p_end_date + 1)::timestamptz
      ),

      'ai_successes', (
        select count(*)
        from range_events
        where (
          feature = 'ai_workspace'
          or event_name like 'workspace_ai%'
        )
          and outcome = 'success'
      ),

      'ai_failures', (
        select count(*)
        from range_events
        where (
          feature = 'ai_workspace'
          or event_name like 'workspace_ai%'
        )
          and outcome = 'failure'
      ),

      'document_actions', (
        select count(*)
        from range_events
        where feature = 'documents'
          or event_name like 'document_%'
      )
    ),

    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', days.day::date::text,
          'events', coalesce(daily_events.event_count, 0),
          'unique_users', coalesce(daily_events.unique_users, 0),
          'signups', coalesce(daily_signups.signups, 0)
        )
        order by days.day
      )
      from generate_series(
        p_start_date,
        p_end_date,
        interval '1 day'
      ) days(day)
      left join daily_events
        on daily_events.day = days.day::date
      left join daily_signups
        on daily_signups.day = days.day::date
    ), '[]'::jsonb),

    'features', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'feature', feature,
          'events', event_count,
          'unique_users', unique_users
        )
        order by event_count desc
      )
      from feature_usage
    ), '[]'::jsonb),

    'buttons', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'button_id', button_id,
          'events', event_count,
          'unique_users', unique_users
        )
        order by event_count desc
      )
      from button_usage
    ), '[]'::jsonb),

    'devices', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'device', device_category,
          'events', event_count,
          'unique_users', unique_users
        )
        order by event_count desc
      )
      from device_usage
    ), '[]'::jsonb),

    'errors', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'event_name', event_name,
          'feature', feature,
          'error_category', error_category,
          'events', event_count,
          'unique_users', unique_users
        )
        order by event_count desc
      )
      from (
        select
          event_name,
          feature,
          error_category,
          count(*) as event_count,
          count(distinct user_id) as unique_users
        from range_events
        where outcome = 'failure'
        group by event_name, feature, error_category
        order by count(*) desc
        limit 20
      ) error_usage
    ), '[]'::jsonb),

    'users', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'events', event_count,
          'features_used', features_used,
          'last_seen', last_seen
        )
        order by last_seen desc
      )
      from (
        select *
        from user_usage
        order by last_seen desc
        limit 100
      ) recent_users
    ), '[]'::jsonb),

    'recent_activity', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'event_name', event_name,
          'feature', feature,
          'button_id', button_id,
          'route', route,
          'device_category', device_category,
          'outcome', outcome,
          'error_category', error_category,
          'occurred_at', occurred_at
        )
        order by occurred_at desc
      )
      from (
        select *
        from range_events
        order by occurred_at desc
        limit 100
      ) recent
    ), '[]'::jsonb),

    'retention', jsonb_build_object(
      'day_1', (
        select round(
          100.0 * count(*) filter (where returned_day_1)
          / nullif(count(*), 0),
          1
        )
        from retention_rows
        where first_day >= p_start_date
          and first_day <= p_end_date - 1
      ),

      'day_7', (
        select round(
          100.0 * count(*) filter (where returned_day_7)
          / nullif(count(*), 0),
          1
        )
        from retention_rows
        where first_day >= p_start_date
          and first_day <= p_end_date - 7
      ),

      'day_30', (
        select round(
          100.0 * count(*) filter (where returned_day_30)
          / nullif(count(*), 0),
          1
        )
        from retention_rows
        where first_day >= p_start_date
          and first_day <= p_end_date - 30
      )
    ),

    'availability', jsonb_build_object(
      'sessions', false,
      'subscriptions', false
    )

  )
  into report;

  return report;
end;
$function$;

revoke all on function public.facemex_analytics_report(date, date, text)
  from public, anon, authenticated;

grant execute on function public.facemex_analytics_report(date, date, text)
  to service_role;