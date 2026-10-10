-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Atomic Code Redemption & Rate Limiting (§4.3, §15.6 #5, Request 17)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Rate limiting table for redemption attempts ──────────────────────────
create table public.code_redemption_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index idx_code_redemption_attempts_ip_time
  on public.code_redemption_attempts (ip, attempted_at);

alter table public.code_redemption_attempts enable row level security;

-- ── 2. Atomic code claim with rate limiting (SECURITY DEFINER) ───────────────
create or replace function public.redeem_student_code_claim(p_code_hash text, p_ip text)
returns table (
  code_id uuid,
  org_id uuid,
  group_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
  v_rec record;
begin
  -- Check rate limit: max 5 attempts per 60 seconds per IP (§4.3)
  select count(*) into v_attempts
  from public.code_redemption_attempts
  where ip = p_ip and attempted_at > (now() - interval '60 seconds');

  if v_attempts >= 5 then
    raise exception 'rate_limit_exceeded';
  end if;

  -- Record this redemption attempt
  insert into public.code_redemption_attempts (ip) values (p_ip);

  -- Atomically claim code (status: pending -> active)
  update public.student_codes
  set status = 'active',
      redeemed_at = now()
  where code_hash = p_code_hash
    and status = 'pending'
    and (expires_at is null or expires_at > now())
  returning id, student_codes.org_id, student_codes.group_id into v_rec;

  if not found then
    if exists (
      select 1 from public.student_codes
      where code_hash = p_code_hash
        and (status = 'expired' or (expires_at is not null and expires_at <= now()))
    ) then
      raise exception 'code_expired';
    elsif exists (
      select 1 from public.student_codes
      where code_hash = p_code_hash and status = 'active'
    ) then
      raise exception 'code_already_used';
    elsif exists (
      select 1 from public.student_codes
      where code_hash = p_code_hash and status = 'revoked'
    ) then
      raise exception 'code_revoked';
    else
      raise exception 'code_not_found';
    end if;
  end if;

  return query select v_rec.id, v_rec.org_id, v_rec.group_id;
end;
$$;

-- ── 3. Revert code claim if account creation fails ───────────────────────────
create or replace function public.redeem_student_code_revert(p_code_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.student_codes
  set status = 'pending',
      redeemed_at = null,
      redeemed_by = null
  where id = p_code_id and status = 'active' and redeemed_by is null;
end;
$$;

-- ── 4. Finalize code claim with redeemed user ID ─────────────────────────────
create or replace function public.redeem_student_code_finalize(p_code_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.student_codes
  set redeemed_by = p_user_id
  where id = p_code_id and status = 'active';
end;
$$;

grant execute on function public.redeem_student_code_claim(text, text) to anon, authenticated, service_role;
grant execute on function public.redeem_student_code_revert(uuid) to anon, authenticated, service_role;
grant execute on function public.redeem_student_code_finalize(uuid, uuid) to anon, authenticated, service_role;
