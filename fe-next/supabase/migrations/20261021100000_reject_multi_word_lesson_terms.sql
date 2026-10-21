-- Teacher word lists (vocabulary_lessons.words) feed the letter board, and the
-- board can only place a single word. Lists like "If you are reading this...."
-- saved "Rely on", "Hospice care" and "Blood transfusion", which can never be
-- played. The editors now reject multi-word terms with a localized message;
-- this trigger is the server-side backstop for direct browser writes.
--
-- * Only NEW multi-word terms are rejected. A term already in the row (OLD)
--   is grandfathered, so existing lists are not mutated and their other
--   fields can still be edited. No data is changed by this migration.
-- * Only direct client writes (authenticated/anon) are checked; service-role
--   jobs and SECURITY DEFINER RPCs are unaffected.
-- * Multi-word = a run of whitespace / hyphen / dash / underscore / slash /
--   middle dot / Hebrew maqaf between two other characters. Kept in step
--   with fe-next/lib/education/singleWordTerm.ts.

create or replace function public.reject_multi_word_lesson_terms()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  sep constant text := '[:space:]_/·־‐‑‒–—-';
  pattern text := '[^' || sep || '][' || sep || ']+[^' || sep || ']';
  bad text[];
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.words is null or jsonb_typeof(new.words) <> 'array' then
    return new;
  end if;

  select array_agg(n.term) into bad
  from (
    select btrim(e->>'word', E' \t\r\n') as term
    from jsonb_array_elements(new.words) e
    where jsonb_typeof(e) = 'object'
  ) n
  where n.term ~ pattern
    and (
      tg_op = 'INSERT'
      or old.words is null
      or jsonb_typeof(old.words) <> 'array'
      or not exists (
        select 1
        from jsonb_array_elements(old.words) o
        where jsonb_typeof(o) = 'object'
          and btrim(o->>'word', E' \t\r\n') = n.term
      )
    );

  if bad is not null then
    raise exception using
      errcode = '23514',
      message = 'lesson_terms_not_single_words',
      detail = array_to_string(bad, ', '),
      hint = 'Only single words can be played on the board.';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_multi_word_lesson_terms on public.vocabulary_lessons;
create trigger reject_multi_word_lesson_terms
  before insert or update of words on public.vocabulary_lessons
  for each row execute function public.reject_multi_word_lesson_terms();
