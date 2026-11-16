-- Used Car Check backend tables (CLAUDE.md §5.3, §9, §10). Safe to run more than once.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- Only the Edge Functions (service role) read and write these tables. Row Level Security is on with no policies
-- for app users, and the helper functions can't be called by app users, so nobody can change their own counters.

-- NHTSA responses, normalized, cached 7 days (key: "vin:<VIN>", "ymm:<year>:<make>:<model>", "makes:<year>", …).
create table if not exists public.vehicle_cache (
  key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

-- Daily counters (premium fair use, VIN photo reads, listing screenshots).
create table if not exists public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  photo_checks int not null default 0,
  listing_checks int not null default 0,
  vin_reads int not null default 0,
  primary key (user_id, day)
);

-- Lifetime counters for the free tier: AI photo checks on the one free inspection.
create table if not exists public.lifetime_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  free_photo_checks int not null default 0
);

-- No passes table: the 30-day pass's end is computed from RevenueCat's purchase dates (functions/_shared/premium.ts).

alter table public.vehicle_cache enable row level security;
alter table public.usage enable row level security;
alter table public.lifetime_usage enable row level security;

-- One AI photo check. Premium: up to p_daily_limit a day (fair use). Free: up to p_free_limit in total.
-- Returns true when allowed (and counted), false at the limit.
create or replace function public.consume_photo_check(p_user uuid, p_day date, p_premium boolean, p_daily_limit int, p_free_limit int)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if p_premium then
    insert into usage as u (user_id, day, photo_checks) values (p_user, p_day, 1)
    on conflict (user_id, day) do update set photo_checks = u.photo_checks + 1
      where u.photo_checks < p_daily_limit
    returning u.photo_checks into n;
  else
    insert into lifetime_usage as l (user_id, free_photo_checks) values (p_user, 1)
    on conflict (user_id) do update set free_photo_checks = l.free_photo_checks + 1
      where l.free_photo_checks < p_free_limit
    returning l.free_photo_checks into n;
    if n is not null then
      insert into usage as u (user_id, day, photo_checks) values (p_user, p_day, 1)
      on conflict (user_id, day) do update set photo_checks = u.photo_checks + 1;
    end if;
  end if;
  return n is not null;
end $$;

-- Gives one photo check back (unusable photo or model error). At most 5 refunds a day so it can't be looped.
create or replace function public.refund_photo_check(p_user uuid, p_day date, p_premium boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if (select coalesce(sum(photo_checks), 0) from usage where user_id = p_user and day = p_day) <= 0 then return; end if;
  update usage set photo_checks = greatest(photo_checks - 1, 0) where user_id = p_user and day = p_day;
  if not p_premium then
    update lifetime_usage set free_photo_checks = greatest(free_photo_checks - 1, 0) where user_id = p_user;
  end if;
end $$;

-- Generic daily counter with a limit (null = no limit). Returns true when allowed (and counted).
create or replace function public.consume_daily(p_user uuid, p_day date, p_field text, p_limit int)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if p_field = 'listing_checks' then
    insert into usage as u (user_id, day, listing_checks) values (p_user, p_day, 1)
    on conflict (user_id, day) do update set listing_checks = u.listing_checks + 1
      where p_limit is null or u.listing_checks < p_limit
    returning u.listing_checks into n;
  elsif p_field = 'vin_reads' then
    insert into usage as u (user_id, day, vin_reads) values (p_user, p_day, 1)
    on conflict (user_id, day) do update set vin_reads = u.vin_reads + 1
      where p_limit is null or u.vin_reads < p_limit
    returning u.vin_reads into n;
  else
    raise exception 'unknown usage field %', p_field;
  end if;
  return n is not null;
end $$;

create or replace function public.usage_status(p_user uuid, p_day date)
returns table (photo_checks_today int, free_photo_checks int, listing_checks_today int)
language sql security definer set search_path = public
as $$
  select
    coalesce((select u.photo_checks from usage u where u.user_id = p_user and u.day = p_day), 0),
    coalesce((select l.free_photo_checks from lifetime_usage l where l.user_id = p_user), 0),
    coalesce((select u.listing_checks from usage u where u.user_id = p_user and u.day = p_day), 0);
$$;

create or replace function public.delete_user_usage(p_user uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from usage where user_id = p_user;
  delete from lifetime_usage where user_id = p_user;
$$;

-- Old cache rows are simply overwritten; this keeps the table small.
create or replace function public.prune_vehicle_cache()
returns void
language sql security definer set search_path = public
as $$
  delete from vehicle_cache where fetched_at < now() - interval '30 days';
$$;

-- App users can't call the helpers; only the service role (Edge Functions) can.
revoke all on function public.consume_photo_check(uuid, date, boolean, int, int) from public, anon, authenticated;
revoke all on function public.refund_photo_check(uuid, date, boolean) from public, anon, authenticated;
revoke all on function public.consume_daily(uuid, date, text, int) from public, anon, authenticated;
revoke all on function public.usage_status(uuid, date) from public, anon, authenticated;
revoke all on function public.delete_user_usage(uuid) from public, anon, authenticated;
revoke all on function public.prune_vehicle_cache() from public, anon, authenticated;
