-- ─────────────────────────────────────────────────────────────────────────────
-- Fix org_seats_v (stats view from 20261010000001, Prathmesh). Found by running the demo on
-- local Supabase: the view LEFT JOINed student_codes and profiles to the org side by side,
-- so every code row paired with every profile row (40 codes × 36 profiles = 1,440 "codes").
-- Count each table independently instead. Same columns, same org scoping
-- (admin_user_id = auth.uid(), because views run with the owner's rights).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.org_seats_v as
select
  o.id as org_id,
  (select count(*) from public.student_codes sc where sc.org_id = o.id) as total_codes_generated,
  (select count(*) from public.student_codes sc where sc.org_id = o.id and sc.status = 'pending') as pending_codes,
  (select count(*) from public.student_codes sc where sc.org_id = o.id and sc.status = 'active') as active_codes,
  (select count(*) from public.student_codes sc where sc.org_id = o.id and sc.status = 'expired') as expired_codes,
  (select count(*) from public.student_codes sc where sc.org_id = o.id and sc.status = 'revoked') as revoked_codes,
  (select count(*) from public.profiles p where p.org_id = o.id and p.role = 'student') as total_students,
  -- Students in the org who didn't come through a Student Code (joined via Player ID).
  (
    select count(*) from public.profiles p
    where p.org_id = o.id
      and p.role = 'student'
      and not exists (select 1 from public.student_codes sc where sc.redeemed_by = p.user_id)
  ) as linked_personal_learners
from public.organizations o
where o.admin_user_id = auth.uid();

grant select on public.org_seats_v to authenticated;
