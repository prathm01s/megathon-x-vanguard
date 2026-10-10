-- ─────────────────────────────────────────────────────────────────────────────
-- Toss Life — Friends' Room tables (§5, §7.6). Owner: Samarth.
--
-- The room is server-authoritative: the `room-action` Edge Function runs the engine's room
-- rules (packages/engine/src/room.ts) and is the ONLY writer (service role). Clients:
--   • read their own `room_views` row (a redacted per-player view) and follow it with Realtime;
--   • never read `rooms.state` or `rooms.seed` (the seed would reveal future market tosses;
--     the state holds everyone's finances and sealed bids).
-- `rooms.state` is the source of truth; the other tables are projections written in the same
-- transaction, for RLS-safe stats (NGO dashboard) and for the decision log.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  -- The host's NGO at creation, so the NGO admin sees the class's rooms.
  org_id uuid references public.organizations (id) on delete set null,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id text not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  turn int not null default 0,
  seed text not null,
  state jsonb not null,
  -- Bumped on every write; clients can ignore stale views.
  version int not null default 0,
  -- When the current turn auto-resolves (turnTimerSeconds); null outside play.
  turn_deadline timestamptz,
  content_version text not null
);
create index rooms_org_idx on public.rooms (org_id);

create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- The engine's member id (m1, m2, …).
  member_key text not null,
  user_id uuid references auth.users (id) on delete cascade,
  is_bot boolean not null,
  bot_strategy text,
  seat int not null,
  nickname text not null,
  trust_score int not null,
  -- The player's playthrough for this room game (humans only), created when the room starts.
  playthrough_id uuid references public.playthroughs (id) on delete set null,
  unique (room_id, member_key),
  unique (room_id, user_id),
  check (is_bot = (user_id is null))
);
create index room_members_user_idx on public.room_members (user_id);

create table public.room_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  room_code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  view jsonb not null,
  version int not null,
  unique (room_id, user_id)
);
create index room_views_code_idx on public.room_views (room_code);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  loan_key text not null,
  -- For offers: the request they answer.
  request_key text,
  lender_kind text check (lender_kind in ('member', 'bank', 'loan_app')),
  lender_member_id uuid references public.room_members (id) on delete set null,
  borrower_member_id uuid not null references public.room_members (id) on delete cascade,
  principal bigint not null check (principal > 0),
  rate_per_turn numeric not null check (rate_per_turn >= 0),
  interest_type text not null check (interest_type in ('simple', 'compound')),
  start_turn int not null,
  due_turn int not null,
  status text not null check (status in ('requested', 'offered', 'active', 'repaid', 'late', 'defaulted', 'declined')),
  repaid_amount bigint not null default 0,
  unique (room_id, loan_key)
);

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  auction_def_id text not null,
  turn int not null,
  status text not null check (status in ('open', 'closed')),
  winner_member_id uuid references public.room_members (id) on delete set null,
  winner_pool_key text,
  winning_bid bigint,
  true_value bigint,
  unique (room_id, auction_def_id)
);

create table public.bid_pools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  pool_key text not null,
  unique (auction_id, pool_key)
);

create table public.bid_pool_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pool_id uuid not null references public.bid_pools (id) on delete cascade,
  member_id uuid not null references public.room_members (id) on delete cascade,
  contribution bigint not null check (contribution > 0),
  unique (pool_id, member_id)
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  member_id uuid references public.room_members (id) on delete cascade,
  pool_id uuid references public.bid_pools (id) on delete cascade,
  amount bigint not null check (amount > 0),
  check (num_nonnulls(member_id, pool_id) = 1)
);

-- ── helpers (SECURITY DEFINER avoids RLS recursion) ─────────────────────────
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid()
  )
$$;

-- The NGO admin of the org a room belongs to (class rooms → dashboard stats).
create or replace function public.is_room_org_admin(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.org_id is not null and r.org_id = public.my_admin_org_id()
  )
$$;

create or replace function public.room_member_user(p_member_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from public.room_members where id = p_member_id
$$;

create or replace function public.room_of_auction(p_auction_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select room_id from public.auctions where id = p_auction_id
$$;

create or replace function public.auction_is_closed(p_auction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select status = 'closed' from public.auctions where id = p_auction_id), false)
$$;

-- ── RLS: read-only for clients; the Edge Function (service role) is the only writer ──
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_views enable row level security;
alter table public.loans enable row level security;
alter table public.auctions enable row level security;
alter table public.bid_pools enable row level security;
alter table public.bid_pool_members enable row level security;
alter table public.bids enable row level security;

revoke all on public.rooms, public.room_members, public.room_views, public.loans,
  public.auctions, public.bid_pools, public.bid_pool_members, public.bids
  from anon, authenticated;

-- rooms: never `state` or `seed`.
grant select (id, created_at, updated_at, code, org_id, host_user_id, chapter_id, status, turn,
  version, turn_deadline, content_version) on public.rooms to authenticated;
create policy "members and the NGO admin read rooms" on public.rooms
  for select using (public.is_room_member(id) or public.is_room_org_admin(id));

grant select on public.room_members to authenticated;
create policy "members and the NGO admin read room members" on public.room_members
  for select using (public.is_room_member(room_id) or public.is_room_org_admin(room_id));

-- Each player reads only their own view (Realtime applies the same policy).
grant select on public.room_views to authenticated;
create policy "players read their own room view" on public.room_views
  for select using (user_id = auth.uid());

grant select on public.loans to authenticated;
create policy "members and the NGO admin read loans" on public.loans
  for select using (public.is_room_member(room_id) or public.is_room_org_admin(room_id));

grant select on public.auctions, public.bid_pools, public.bid_pool_members to authenticated;
create policy "members and the NGO admin read auctions" on public.auctions
  for select using (public.is_room_member(room_id) or public.is_room_org_admin(room_id));
create policy "members and the NGO admin read pools" on public.bid_pools
  for select using (
    public.is_room_member(public.room_of_auction(auction_id))
    or public.is_room_org_admin(public.room_of_auction(auction_id))
  );
create policy "members and the NGO admin read pool members" on public.bid_pool_members
  for select using (
    exists (
      select 1 from public.bid_pools p
      where p.id = pool_id
        and (public.is_room_member(public.room_of_auction(p.auction_id))
             or public.is_room_org_admin(public.room_of_auction(p.auction_id)))
    )
  );

-- Sealed bids: your own bid, or everyone's once the auction has closed. The NGO admin sees all.
grant select on public.bids to authenticated;
create policy "own bids, or all bids after the auction closes" on public.bids
  for select using (
    public.room_member_user(member_id) = auth.uid()
    or (public.auction_is_closed(auction_id) and public.is_room_member(public.room_of_auction(auction_id)))
    or public.is_room_org_admin(public.room_of_auction(auction_id))
  );

grant all on public.rooms, public.room_members, public.room_views, public.loans,
  public.auctions, public.bid_pools, public.bid_pool_members, public.bids to service_role;

-- Realtime: players follow their own room_views row.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.room_views;
  end if;
end
$$;
