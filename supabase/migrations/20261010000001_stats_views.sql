-- ─────────────────────────────────────────────────────────────────────────────
-- Toss Life — statistics views for the NGO dashboard (§4.7, §5, §15.4 C)
-- Owner: Prathmesh
-- Maps decisions, chapter_results, mindset_responses and profiles into
-- aggregated, RLS-safe views for the NGO administrator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Seats overview ───────────────────────────────────────────────────────
create or replace view public.org_seats_v as
select
  o.id as org_id,
  count(sc.id) as total_codes_generated,
  count(sc.id) filter (where sc.status = 'pending') as pending_codes,
  count(sc.id) filter (where sc.status = 'active') as active_codes,
  count(sc.id) filter (where sc.status = 'expired') as expired_codes,
  count(sc.id) filter (where sc.status = 'revoked') as revoked_codes,
  count(p.user_id) filter (where p.role = 'student') as total_students,
  count(p.user_id) filter (where p.role = 'student' and sc.id is null) as linked_personal_learners
from public.organizations o
left join public.student_codes sc on sc.org_id = o.id
left join public.profiles p on p.org_id = o.id
where o.admin_user_id = auth.uid()
group by o.id;

-- ── 2. Engagement statistics ────────────────────────────────────────────────
create or replace view public.org_engagement_v as
select
  o.id as org_id,
  count(distinct p.user_id) as total_students,
  count(distinct case when pt.updated_at >= now() - interval '7 days' then p.user_id end) as active_students_7d,
  count(distinct case when pt.updated_at >= now() - interval '30 days' then p.user_id end) as active_students_30d,
  count(distinct pt.id) as total_playthroughs,
  count(distinct cr.id) filter (where cr.passed = true) as completed_chapters
from public.organizations o
join public.profiles p on p.org_id = o.id and p.role = 'student'
left join public.playthroughs pt on pt.user_id = p.user_id
left join public.chapter_results cr on cr.playthrough_id = pt.id
where o.admin_user_id = auth.uid()
group by o.id;

-- ── 3. Persona distribution ─────────────────────────────────────────────────
create or replace view public.org_persona_distribution_v as
select
  o.id as org_id,
  coalesce(pt.persona_id, mr.persona_id, 'unassigned') as persona_id,
  count(distinct p.user_id) as student_count
from public.organizations o
join public.profiles p on p.org_id = o.id and p.role = 'student'
left join lateral (
  select persona_id from public.playthroughs
  where user_id = p.user_id
  order by created_at desc limit 1
) pt on true
left join lateral (
  select persona_id from public.mindset_responses
  where user_id = p.user_id
  order by created_at desc limit 1
) mr on true
where o.admin_user_id = auth.uid()
group by o.id, coalesce(pt.persona_id, mr.persona_id, 'unassigned');

-- ── 4. Learning gain (pre vs post mindset comparison) ────────────────────────
create or replace view public.org_learning_gain_v as
with pre_scores as (
  select
    p.org_id,
    avg((mr.scores->>'plan')::numeric) as avg_plan,
    avg((mr.scores->>'risk')::numeric) as avg_risk,
    avg((mr.scores->>'know')::numeric) as avg_know,
    count(*) as count_pre
  from public.mindset_responses mr
  join public.profiles p on p.user_id = mr.user_id
  where mr.phase = 'pre'
  group by p.org_id
),
post_scores as (
  select
    p.org_id,
    avg((mr.scores->>'plan')::numeric) as avg_plan,
    avg((mr.scores->>'risk')::numeric) as avg_risk,
    avg((mr.scores->>'know')::numeric) as avg_know,
    count(*) as count_post
  from public.mindset_responses mr
  join public.profiles p on p.user_id = mr.user_id
  where mr.phase = 'post'
  group by p.org_id
)
select
  o.id as org_id,
  coalesce(round(pre.avg_plan, 2), 0) as pre_avg_plan,
  coalesce(round(pre.avg_risk, 2), 0) as pre_avg_risk,
  coalesce(round(pre.avg_know, 2), 0) as pre_avg_know,
  coalesce(round(post.avg_plan, 2), 0) as post_avg_plan,
  coalesce(round(post.avg_risk, 2), 0) as post_avg_risk,
  coalesce(round(post.avg_know, 2), 0) as post_avg_know,
  coalesce(pre.count_pre, 0) as total_pre_completed,
  coalesce(post.count_post, 0) as total_post_completed
from public.organizations o
left join pre_scores pre on pre.org_id = o.id
left join post_scores post on post.org_id = o.id
where o.admin_user_id = auth.uid();

-- ── 5. Scam safety stats (from DECISION_TYPES: scam_fallen, scam_spotted) ────
create or replace view public.org_scam_stats_v as
select
  o.id as org_id,
  count(d.id) filter (where d.type in ('scam_fallen', 'scam_spotted')) as scams_faced,
  count(d.id) filter (where d.type = 'scam_fallen') as scams_fallen,
  count(d.id) filter (where d.type = 'scam_spotted') as scams_spotted,
  case
    when count(d.id) filter (where d.type in ('scam_fallen', 'scam_spotted')) > 0
    then round(
      (count(d.id) filter (where d.type = 'scam_fallen')::numeric /
       count(d.id) filter (where d.type in ('scam_fallen', 'scam_spotted'))::numeric) * 100,
      1
    )
    else 0
  end as fall_rate
from public.organizations o
join public.profiles p on p.org_id = o.id and p.role = 'student'
join public.playthroughs pt on pt.user_id = p.user_id
join public.decisions d on d.playthrough_id = pt.id
where o.admin_user_id = auth.uid()
group by o.id;

-- ── 6. Chapter performance stats ────────────────────────────────────────────
create or replace view public.org_chapter_stats_v as
select
  o.id as org_id,
  cr.chapter_id,
  count(cr.id) as attempts_count,
  count(cr.id) filter (where cr.passed = true) as passed_count,
  round(avg(cr.health_score), 1) as avg_health_score
from public.organizations o
join public.profiles p on p.org_id = o.id and p.role = 'student'
join public.playthroughs pt on pt.user_id = p.user_id
join public.chapter_results cr on cr.playthrough_id = pt.id
where o.admin_user_id = auth.uid()
group by o.id, cr.chapter_id;

-- ── 7. Individual student list for admin ─────────────────────────────────────
create or replace view public.org_student_detail_v as
select
  p.user_id,
  p.org_id,
  p.nickname,
  p.username,
  p.player_id,
  p.avatar_id,
  p.locale,
  sc.label as code_label,
  sc.code_last4,
  coalesce(pt.persona_id, mr.persona_id, 'unassigned') as persona_id,
  pt.current_chapter_id as latest_chapter_id,
  round(avg(cr.health_score), 1) as avg_health_score,
  count(distinct be.badge_id) as badges_count,
  max(pt.updated_at) as last_active_at
from public.profiles p
join public.organizations o on o.id = p.org_id and o.admin_user_id = auth.uid()
left join public.student_codes sc on sc.redeemed_by = p.user_id
left join lateral (
  select persona_id, current_chapter_id, updated_at
  from public.playthroughs
  where user_id = p.user_id
  order by updated_at desc limit 1
) pt on true
left join lateral (
  select persona_id
  from public.mindset_responses
  where user_id = p.user_id
  order by created_at desc limit 1
) mr on true
left join public.playthroughs all_pt on all_pt.user_id = p.user_id
left join public.chapter_results cr on cr.playthrough_id = all_pt.id
left join public.badges_earned be on be.user_id = p.user_id
where p.role = 'student'
group by
  p.user_id, p.org_id, p.nickname, p.username, p.player_id,
  p.avatar_id, p.locale, sc.label, sc.code_last4,
  coalesce(pt.persona_id, mr.persona_id, 'unassigned'),
  pt.current_chapter_id;

-- ── Grants ──────────────────────────────────────────────────────────────────
grant select on public.org_seats_v to authenticated;
grant select on public.org_engagement_v to authenticated;
grant select on public.org_persona_distribution_v to authenticated;
grant select on public.org_learning_gain_v to authenticated;
grant select on public.org_scam_stats_v to authenticated;
grant select on public.org_chapter_stats_v to authenticated;
grant select on public.org_student_detail_v to authenticated;
