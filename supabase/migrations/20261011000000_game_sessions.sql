-- ─────────────────────────────────────────────────────────────────────────────
-- Game sessions for the "time machine" (2026-10-11, Samarth, at the team's request).
-- One row per chapter attempt: the session log (how it started + every step the player took),
-- small enough to store whole. The app rebuilds the game from it at any point, asks "what if I
-- hadn't?", and starts branches. The engine is deterministic, so the log is the source of truth.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.game_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id text not null,
  data jsonb not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index game_sessions_user_idx on public.game_sessions (user_id, started_at desc);

alter table public.game_sessions enable row level security;

create policy "own game sessions" on public.game_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads game sessions" on public.game_sessions
  for select using (public.is_admin_of_student(user_id));

grant select, insert, update on public.game_sessions to authenticated;
