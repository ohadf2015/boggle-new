-- READ-ONLY. Approved teacher_access_requests rows that neither approval path
-- would have written. Both paths set reviewed_at at approval: the instant path
-- (service role, seconds after insert, no reviewed_by) and the admin path
-- (reviewed_by = an admin). Both also promote the profile to teacher.
select
  r.id,
  r.user_id,
  r.email,
  r.created_at,
  r.reviewed_at,
  r.reviewed_by,
  r.trial_expires_at,
  p.user_role,
  u.email as account_email,
  array_remove(array[
    case when r.reviewed_at is null then 'no_reviewed_at' end,
    case when r.reviewed_at < r.created_at then 'reviewed_before_created' end,
    case when r.reviewed_by is null and r.reviewed_at - r.created_at > interval '10 minutes'
      then 'instant_path_too_slow' end,
    case when r.reviewed_by is not null and coalesce(rp.is_admin, false) = false
      then 'reviewer_not_admin' end,
    case when r.user_id is not null and p.user_role::text not in ('teacher', 'admin')
      then 'profile_not_promoted' end,
    case when r.user_id is not null and lower(u.email) <> lower(r.email)
      then 'email_not_account_email' end,
    case when r.trial_expires_at > coalesce(r.reviewed_at, r.created_at) + interval '45 days'
      then 'trial_window_too_long' end
  ], null) as reasons
from public.teacher_access_requests r
left join public.profiles p on p.id = r.user_id
left join auth.users u on u.id = r.user_id
left join public.profiles rp on rp.id = r.reviewed_by
where r.status = 'approved'
  and (
    r.reviewed_at is null
    or r.reviewed_at < r.created_at
    or (r.reviewed_by is null and r.reviewed_at - r.created_at > interval '10 minutes')
    or (r.reviewed_by is not null and coalesce(rp.is_admin, false) = false)
    or (r.user_id is not null and p.user_role::text not in ('teacher', 'admin'))
    or (r.user_id is not null and lower(u.email) <> lower(r.email))
    or r.trial_expires_at > coalesce(r.reviewed_at, r.created_at) + interval '45 days'
  )
order by r.created_at desc;
