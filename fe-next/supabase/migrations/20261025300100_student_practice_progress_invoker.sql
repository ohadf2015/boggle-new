-- The view was recreated without security_invoker, so it read practice_sessions
-- as its owner and anyone holding the anon key could list every student's
-- practice. As invoker, practice_sessions RLS (own rows, lesson teacher,
-- teacher of student) applies to every read.
alter view public.student_practice_progress set (security_invoker = true);

revoke all on public.student_practice_progress from anon, authenticated;
grant select on public.student_practice_progress to authenticated;
