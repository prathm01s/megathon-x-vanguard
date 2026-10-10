-- ─────────────────────────────────────────────────────────────────────────────
-- Toss Life — first migration: accounts, organisations, codes, gameplay records.
-- §4 (accounts), §5 (data model), §6 (privacy). Owner: Prathmesh.
-- Room tables (rooms, loans, auctions, bids, pools) come in Samarth's *_rooms_* migration.
--
-- Rules: every table has RLS on. Students read/write only their own rows; the
-- NGO admin reads every row for their org. Code redemption, password reset and
-- other admin writes go through server code using the service role.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── enums ───────────────────────────────────────────────────────────────────
create type public.user_role as enum ('ngo_admin', 'student');
create type public.code_status as enum ('pending', 'active', 'expired', 'revoked');
create type public.join_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.mindset_phase as enum ('pre', 'post');
create type public.playthrough_status as enum ('active', 'completed', 'abandoned');

-- ── helpers ─────────────────────────────────────────────────────────────────
-- Unambiguous alphabet (no 0/O/1/I/L) shared by Player IDs and Student Codes (§4.3).
create or replace function public.random_code(len int)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  return result;
end;
$$;

-- ── organizations ───────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  -- Each NGO has exactly one admin (§4.1).
  admin_user_id uuid not null unique references auth.users (id) on delete restrict,
  settings jsonb not null default '{"codeExpiryDays": 30}'::jsonb
);

-- ── profiles ────────────────────────────────────────────────────────────────
-- No real names, phone numbers, school, address etc. are ever stored (§6).
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  role public.user_role not null,
  org_id uuid references public.organizations (id) on delete set null,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  nickname text not null check (char_length(nickname) between 1 and 30),
  avatar_id text not null default 'avatar-1',
  player_id text not null unique default ('TL-' || public.random_code(5)),
  locale text not null default 'en' check (locale in ('en', 'te', 'hi', 'ur')),
  has_recovery_email boolean not null default false
);
create index profiles_org_id_idx on public.profiles (org_id);

-- The org the signed-in user administers (null for students). SECURITY DEFINER avoids RLS recursion.
create or replace function public.my_admin_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.organizations where admin_user_id = auth.uid()
$$;

-- True when the signed-in user is the admin of the org `student_id` belongs to.
create or replace function public.is_admin_of_student(student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.org_id
    where p.user_id = student_id and o.admin_user_id = auth.uid()
  )
$$;

-- Users may edit their nickname, avatar and locale; never their role, org, username or Player ID.
-- Server code (service role) and SECURITY DEFINER RPCs (which run as the owner) may.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.org_id is distinct from old.org_id
     or new.username is distinct from old.username
     or new.player_id is distinct from old.player_id then
    raise exception 'role, org, username and player id can only be changed by the server';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ── groups (batches) ────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  unique (org_id, name)
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  group_id uuid not null references public.groups (id) on delete cascade,
  student_user_id uuid not null references public.profiles (user_id) on delete cascade,
  unique (group_id, student_user_id)
);

-- ── student codes (§4.3) ────────────────────────────────────────────────────
-- Only a hash of the code is stored, plus the last 4 characters for display.
create table public.student_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  code_hash text not null unique,
  code_last4 text not null check (char_length(code_last4) = 4),
  -- Admin-only private label. UI hint: "Avoid full names."
  label text check (char_length(label) <= 60),
  group_id uuid references public.groups (id) on delete set null,
  status public.code_status not null default 'pending',
  expires_at timestamptz,
  created_by uuid not null references auth.users (id),
  redeemed_by uuid references auth.users (id),
  redeemed_at timestamptz
);
create index student_codes_org_status_idx on public.student_codes (org_id, status);

-- ── join requests (§4.4) ────────────────────────────────────────────────────
create table public.org_join_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  student_user_id uuid not null references public.profiles (user_id) on delete cascade,
  status public.join_request_status not null default 'pending',
  requested_by uuid not null references auth.users (id)
);
create unique index org_join_requests_one_pending
  on public.org_join_requests (org_id, student_user_id) where status = 'pending';

-- ── gameplay ────────────────────────────────────────────────────────────────
create table public.mindset_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  phase public.mindset_phase not null,
  answers jsonb not null,
  scores jsonb not null, -- { plan, risk, know }
  persona_id text not null,
  content_version text not null
);
create index mindset_responses_user_idx on public.mindset_responses (user_id, phase);

create table public.playthroughs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  persona_id text not null,
  seed text not null,
  content_version text not null,
  current_chapter_id text not null,
  status public.playthrough_status not null default 'active',
  state jsonb not null -- engine GameState snapshot
);
create index playthroughs_user_idx on public.playthroughs (user_id);

create table public.chapter_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  playthrough_id uuid not null references public.playthroughs (id) on delete cascade,
  chapter_id text not null,
  attempt int not null default 1,
  health_score int not null check (health_score between 0 and 100),
  score_breakdown jsonb not null,
  report jsonb not null,
  passed boolean not null,
  completed_at timestamptz not null default now(),
  unique (playthrough_id, chapter_id, attempt)
);

-- Append-only event log: drives analytics and replays (§5, §15.4 C).
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  playthrough_id uuid not null references public.playthroughs (id) on delete cascade,
  chapter_id text not null,
  turn int not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb
);
create index decisions_playthrough_idx on public.decisions (playthrough_id, chapter_id, turn);
create index decisions_type_idx on public.decisions (type);

create table public.gyaan_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  playthrough_id uuid not null references public.playthroughs (id) on delete cascade,
  chapter_id text not null,
  question_id text not null,
  correct boolean not null
);

create table public.badges_earned (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- Owner of a playthrough (used by child-table policies).
create or replace function public.playthrough_owner(p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from public.playthroughs where id = p_id
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.student_codes enable row level security;
alter table public.org_join_requests enable row level security;
alter table public.mindset_responses enable row level security;
alter table public.playthroughs enable row level security;
alter table public.chapter_results enable row level security;
alter table public.decisions enable row level security;
alter table public.gyaan_answers enable row level security;
alter table public.badges_earned enable row level security;

-- organizations: the admin manages it; members can read its name.
create policy "admin reads own org" on public.organizations
  for select using (admin_user_id = auth.uid());
create policy "members read their org" on public.organizations
  for select using (id = (select org_id from public.profiles where user_id = auth.uid()));
create policy "admin updates own org" on public.organizations
  for update using (admin_user_id = auth.uid()) with check (admin_user_id = auth.uid());
-- Inserts happen via create_organization() below.

-- profiles
create policy "read own profile" on public.profiles
  for select using (user_id = auth.uid());
create policy "admin reads org profiles" on public.profiles
  for select using (org_id is not null and org_id = public.my_admin_org_id());
create policy "create own personal profile" on public.profiles
  for insert with check (user_id = auth.uid() and org_id is null);
create policy "update own profile" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- groups / group_members: admin only
create policy "admin manages groups" on public.groups
  for all using (org_id = public.my_admin_org_id()) with check (org_id = public.my_admin_org_id());
create policy "admin manages group members" on public.group_members
  for all
  using (exists (select 1 from public.groups g where g.id = group_id and g.org_id = public.my_admin_org_id()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.org_id = public.my_admin_org_id()));

-- student_codes: admin reads / revokes; generation and redemption run server-side (service role).
create policy "admin reads codes" on public.student_codes
  for select using (org_id = public.my_admin_org_id());
create policy "admin updates codes" on public.student_codes
  for update using (org_id = public.my_admin_org_id()) with check (org_id = public.my_admin_org_id());

-- join requests: admin creates and reads; the student reads their own. Accepting goes through the RPC.
create policy "admin creates join requests" on public.org_join_requests
  for insert with check (org_id = public.my_admin_org_id() and requested_by = auth.uid());
create policy "admin reads join requests" on public.org_join_requests
  for select using (org_id = public.my_admin_org_id());
create policy "student reads own join requests" on public.org_join_requests
  for select using (student_user_id = auth.uid());

-- gameplay: students own their rows; admins read their students' rows.
create policy "own mindset" on public.mindset_responses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads mindset" on public.mindset_responses
  for select using (public.is_admin_of_student(user_id));

create policy "own playthroughs" on public.playthroughs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads playthroughs" on public.playthroughs
  for select using (public.is_admin_of_student(user_id));

create policy "own chapter results" on public.chapter_results
  for all using (public.playthrough_owner(playthrough_id) = auth.uid())
  with check (public.playthrough_owner(playthrough_id) = auth.uid());
create policy "admin reads chapter results" on public.chapter_results
  for select using (public.is_admin_of_student(public.playthrough_owner(playthrough_id)));

-- decisions are append-only: insert + select, never update/delete.
create policy "insert own decisions" on public.decisions
  for insert with check (public.playthrough_owner(playthrough_id) = auth.uid());
create policy "read own decisions" on public.decisions
  for select using (public.playthrough_owner(playthrough_id) = auth.uid());
create policy "admin reads decisions" on public.decisions
  for select using (public.is_admin_of_student(public.playthrough_owner(playthrough_id)));

create policy "own gyaan answers" on public.gyaan_answers
  for all using (public.playthrough_owner(playthrough_id) = auth.uid())
  with check (public.playthrough_owner(playthrough_id) = auth.uid());
create policy "admin reads gyaan answers" on public.gyaan_answers
  for select using (public.is_admin_of_student(public.playthrough_owner(playthrough_id)));

create policy "own badges" on public.badges_earned
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads badges" on public.badges_earned
  for select using (public.is_admin_of_student(user_id));

-- ── RPCs ────────────────────────────────────────────────────────────────────
-- NGO signup (§4.2): creates the org and the admin profile in one transaction.
create or replace function public.create_organization(p_name text, p_username text, p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.organizations (name, admin_user_id) values (p_name, auth.uid()) returning id into new_org;
  insert into public.profiles (user_id, role, org_id, username, nickname, has_recovery_email)
  values (auth.uid(), 'ngo_admin', new_org, p_username, p_nickname, true);
  return new_org;
end;
$$;

-- Student accepts or declines an admin's join request (§4.4). Progress stays with the student.
create or replace function public.respond_to_join_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.org_join_requests;
begin
  select * into req from public.org_join_requests
  where id = p_request_id and student_user_id = auth.uid() and status = 'pending'
  for update;
  if not found then
    raise exception 'join request not found';
  end if;
  if p_accept then
    if exists (select 1 from public.profiles where user_id = auth.uid() and org_id is not null) then
      raise exception 'already part of an NGO';
    end if;
    update public.profiles set org_id = req.org_id where user_id = auth.uid();
  end if;
  update public.org_join_requests
  set status = case when p_accept then 'accepted'::public.join_request_status else 'declined'::public.join_request_status end
  where id = req.id;
end;
$$;

grant execute on function public.create_organization(text, text, text) to authenticated;
grant execute on function public.respond_to_join_request(uuid, boolean) to authenticated;
