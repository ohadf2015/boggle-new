-- Students write their own progress/achievement rows from the browser (word
-- attempts, assignment stamps, pins), and RLS lets them update the whole row.
-- That also let a student set their own XP, level, streak or achievement tier.
-- These triggers keep the earned columns unchanged for direct student writes;
-- the XP RPCs (SECURITY DEFINER, run as the owner) and service-role jobs are
-- unaffected.

create or replace function public.guard_student_lesson_progress_earned()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.total_xp := 0;
    new.current_level := 1;
    new.current_streak := 0;
    new.longest_streak := 0;
    new.total_practice_sessions := 0;
    new.last_practice_date := null;
  else
    new.total_xp := old.total_xp;
    new.current_level := old.current_level;
    new.current_streak := old.current_streak;
    new.longest_streak := old.longest_streak;
    new.total_practice_sessions := old.total_practice_sessions;
    new.last_practice_date := old.last_practice_date;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_student_lesson_progress_earned on public.student_lesson_progress;
create trigger protect_student_lesson_progress_earned
  before insert or update on public.student_lesson_progress
  for each row execute function public.guard_student_lesson_progress_earned();

create or replace function public.guard_student_achievements_earned()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  -- A student may only pin or unpin.
  new.student_id := old.student_id;
  new.achievement_id := old.achievement_id;
  new.current_tier := old.current_tier;
  new.progress_value := old.progress_value;
  new.unlocked_at := old.unlocked_at;
  new.last_tier_unlock := old.last_tier_unlock;
  return new;
end;
$$;

drop trigger if exists protect_student_achievements_earned on public.student_achievements;
create trigger protect_student_achievements_earned
  before update on public.student_achievements
  for each row execute function public.guard_student_achievements_earned();
