# Test / QA Accounts

**Convention: every QA or automation account signs up with an `@lexiclash.test` email.**

A DB trigger sets `profiles.is_test_account = true` from that address, and a second
trigger flags any student who joins a test teacher's classroom (QA guest students are
anonymous — `auth.users.email IS NULL` — so email alone never catches them).
See `fe-next/supabase/migrations/20260912100000_add_is_test_account_flag.sql`.

## Why
On 2026-09-12 a purge removed **93 of 787 profiles (11.8%)** and **14 of 32 classrooms
(44%)** that were gauntlet rigs from the 09-05 → 09-12 capture runs. 64 of the 93 were
anonymous guest students, reachable only via the classrooms they had joined. None of it
was identifiable from a column — the predicate had to be reconstructed by hand from
email patterns and display names. That is what the flag prevents.

## Rules
- [ ] Creating an account for a capture/gauntlet/E2E run? Use `<tag>@lexiclash.test`. Never a real domain, never a `+qa` alias on a personal Gmail — neither is auto-flagged.
- [ ] Adding a metric that counts users, teachers, classrooms or students? Exclude `is_test_account`. The choke point for the teacher funnel is `buildTeacherFunnel()` in `lib/education/teacherFunnel.ts` — filter there, not per query.
- [ ] Cleaning up after a run: `DELETE FROM auth.users WHERE id IN (SELECT id FROM profiles WHERE is_test_account);` — one predicate, no pattern matching.
- [ ] `student_duels.winner_id` is `ON DELETE NO ACTION` and will abort that delete. 26 FKs to `auth.users`/`profiles` are NO ACTION; clear the children first. Preflight with a count per table rather than discovering it from a failed transaction.
- [ ] Deleting is irreversible: snapshot first (`CREATE TABLE qa_purge_backup_<date> AS SELECT ... , to_jsonb(p.*) ...`). The 2026-09-12 backup is `public.qa_purge_backup_20260912` (+ `_duels`).
- [ ] PostHog events for purged users are **not** removed by a DB delete — funnels still need `$host` filtering and a date cutoff to match post-purge DB numbers.
