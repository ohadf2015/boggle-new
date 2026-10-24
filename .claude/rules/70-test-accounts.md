# Test / QA Accounts

**Convention: every QA or automation account signs up with an `@lexiclash.test` email.**

**Where: never in production.** Since 2026-10-24 (Ohad's decision) no QA, gauntlet, critic, capture or E2E
run creates accounts on www.lexiclash.live / the prod Supabase project (`hdtmpkicuxvtmvrmtybx`), not
through the UI and not through the admin API. Prod signups are counted as real by Growth Radar
(`growth:signup_completed` carries no email, so it cannot be filtered after the fact) — the week of
10-17 had 19 QA signups in prod. Run signup/account QA against a local stack instead: a dev server
on `localhost` pointed at a local Supabase (GoTrue + Postgres loaded with the prod *schema* only).
On the Grok Bot box that is `/workspace/qa-accounts` (`./stack.sh up && ./run-app.sh &&
node signup.mjs`), which refuses any lexiclash.live / `*.supabase.co` target. Loopback traffic is
already stamped `env=dev` by Growth Radar ingest. Reusing an *existing* prod test account to look
at a signed-in page is still OK; creating a new one is not.

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
- [ ] Creating an account for a capture/gauntlet/E2E run? Do it on the local stack, never on prod, and use `<tag>@lexiclash.test`. Never a real domain, never a `+qa` alias on a personal Gmail — neither is auto-flagged.
- [ ] Adding a metric that counts users, teachers, classrooms or students? Exclude `is_test_account`. The choke point for the teacher funnel is `buildTeacherFunnel()` in `lib/education/teacherFunnel.ts` — filter there, not per query.
- [ ] Cleaning up prod test accounts needs Ohad's OK first. Cleaning up after a run: `DELETE FROM auth.users WHERE id IN (SELECT id FROM profiles WHERE is_test_account);` — one predicate, no pattern matching.
- [ ] `student_duels.winner_id` is `ON DELETE NO ACTION` and will abort that delete. 26 FKs to `auth.users`/`profiles` are NO ACTION; clear the children first. Preflight with a count per table rather than discovering it from a failed transaction.
- [ ] Deleting is irreversible: snapshot first (`CREATE TABLE qa_purge_backup_<date> AS SELECT ... , to_jsonb(p.*) ...`). The 2026-09-12 backup is `public.qa_purge_backup_20260912` (+ `_duels`).
- [ ] PostHog events for purged users are **not** removed by a DB delete — funnels still need `$host` filtering and a date cutoff to match post-purge DB numbers.
