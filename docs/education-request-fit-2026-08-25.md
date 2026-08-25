# Education access requests vs. what the module actually does

**Date:** 2026-08-25 · **Corpus:** `teacher_access_requests`, 35 rows, 2026-06-09 → 2026-08-24

## What teachers asked for

All 35 requests are approved. Locale split: en 27 · es 7 · he 1. Countries skew hard to
EFL/ESL contexts — SK, EC, PE, MX, CO, NI, BR, VN, KR, NG, PH, BD, SA, AZ, IL, NL, AU, US.
The recurring shape is *a teacher teaching English while working in a non-English UI locale*.

**The free text does not support a feature backlog.** About 13 of 35 `use_case` values are
verbatim echoes of our own form chips (`isChipEcho()` in `lib/education/useCaseChips.ts`
exists precisely because this happened before). Of the ~22 genuine answers, most are 2–5
words ("To improve", "Vocabulary games"). Ranking themes across that corpus would mean
shipping a mode off a single person typing *Site Word Builder*.

The honest aggregate, and it is unanimous: **vocabulary and spelling practice with their own
class, live or as homework.** That is what the module already claims to do.

The one concrete, repeated, actionable detail is **grade bands** — "2nd to 6th graders" (NI),
"9th and 10th graders" (US), "כיתה ה" / 5th grade (IL).

## So the fit gap is not missing features

| Stage | Count |
|---|---|
| Requests approved | 35 (rows, incl. repeat submitters) |
| Have `user_role = 'teacher'` | 23 (distinct users) |
| Created a classroom | **2** |
| Created a lesson | 2 |
| Student memberships | **1** |
| Lesson assignments | 2 |
| Assignment completions | 0 |

The funnel dies at the teacher's **first action**, not at any feature. Two causes, both
confirmed, both wiring:

### G1 — 138 curated grade-level word lists were unreachable

`curriculum_word_lists` holds 138 active rows (en 90 / he 48) across `grade_1`…`grade_12`.
`CurriculumWordListBrowser` is a complete, working browser with grade/subject filters and a
one-click import. It was mounted at exactly one place: `/teacher/curriculum` — a route with
**zero in-app links**. Only `sitemap`/`generatedRoutes`/an e2e spec referenced it.

So the single most concrete thing teachers named (grade bands) sat behind a URL nobody could
find, while `StarterPacksSection` offered 3 hardcoded English-only packs instead.

RLS was checked as a non-admin, not as `service_role`: the SELECT policy is
`merged_curriculum_word_lists_select_public` with qual `(is_admin OR is_active = true)` for
role `{public}`. Teachers can read all 138. Not a policy bug — purely a missing link.

### G4 — the dashboard opened on a tab with no reachable action

`TeacherDashboard` opens on the `play` tab. For a teacher with zero classrooms that tab
offered "Start Game" (needs a classroom), an optional QuickStart, and a tip. **No
create-classroom CTA.** The `review` tab already had a correct zero-state — the affordance
existed, it was just on the branch a new teacher never visits.

## Hypotheses checked and disproved

Recording these so they are not re-audited.

- **Language filter lockout** — plausible that a `locale='es'` teacher gets zero curriculum
  rows, since content is en+he only. **False.** `CurriculumWordListBrowser` exposes only
  grade and subject filters; `filters.language` is never set, so `.eq('language', …)` never
  fires. Every teacher sees all 138 regardless of locale.
- **Broken homework loop** — 2 assignments, 0 completions looked like a dead chain.
  **False.** `getStudentAssignedLessons` is called by `hooks/useStudentProgress.ts:80`, and
  `app/[locale]/student/lessons/` renders it. The loop is wired; it is unused because only
  **one** student has ever joined a classroom.
- **Teacher-role grant regression** — 35 approved rows but 23 users with the role, which
  reads as a 12-teacher hole. **False.** Two effects, and they close it: 6 approved rows
  have **no `profiles` row at all** (all reviewed on/before 2026-07-02, pre-dating the
  2026-08-20 approval-RLS fix — residue, not live), and **rows are not users** — several
  teachers submitted more than once, so the remaining 29 approved-with-profile rows map onto
  ~23 distinct people. No teacher is missing a grant.

## Shipped

Two wiring changes in `components/teacher/TeacherDashboard.tsx`, both reusing existing
translation keys (no new keys in any of the 5 locales):

1. **Zero-classroom CTA on the `play` tab** — **shipped independently by a concurrent
   session** (`PlayTabFirstRunCard`, commit `baf78c10e`) while this audit was running. Two
   sessions diagnosed the same gap from opposite directions, which is corroboration, not
   waste. Theirs is the better version and was kept on rebase: a four-way branch (error →
   loading skeleton → empty → has classrooms) against the two-way `!isLoading &&
   classrooms.length === 0` guard written here.
   Both landed on the same pitfall-Class-1 trap, worth recording: `classrooms` is `[]` while
   `isLoading` is still `true`, and `play` is the **landing** tab, so a bare
   `classrooms.length === 0` check flashes "create your first classroom" at every teacher on
   first paint. The `review` tab's identical bare check is safe only because reaching it
   takes a deliberate click — that precedent does not transfer to the landing tab. A RED
   test caught it here; inspection had not.
   `LessonBuilder` was verified to work without a classroom (`classroomId: formData.classroomId || undefined`),
   so `prepare` is a live surface for a brand-new teacher.
2. **`CurriculumWordListBrowser` mounted in the `prepare` tab** — the surviving change from
   this audit. The 138 grade-level lists are now reachable from the dashboard, with
   `teacherId` from `useAuth()` and `classroomId` passed only when one is selected (import
   creates an unattached lesson otherwise).

Tests: `components/teacher/__tests__/TeacherDashboard.curriculum.test.tsx` (2 cases). The
play-tab state matrix is covered by the concurrent session's
`TeacherDashboard.firstRun.test.tsx` (15 cases), which supersedes the 3 written here.

## Left alone, deliberately

- **`StarterPacksSection`'s 3 hardcoded packs vs. 138 DB rows** — real duplication, but
  consolidating is a second change with no demand signal behind it.
- **`teacher_assignments` and `assignment_completions`** — dead schema. No app code reads or
  writes either (only `database.types.ts` and an admin funnel counter). The live table is
  `lesson_assignments`, and `assignment_completions`' RLS joins `teacher_assignments`, so
  nothing could ever write it. Don't build on these.
- **A sight-words or quiz mode** — one request each. Not a signal.
- **Curriculum copy** — `teacher.curriculum.description` reads "aligned with Israeli
  educational standards" in all 5 locales, which is now wrong for a Peru/Vietnam/Nigeria
  requester base. Only `title` is rendered in the dashboard, so this is latent, not visible.

## The next real constraint

Both fixes address teacher→classroom. The stage after it is untested at any volume:
**1 student has ever joined a classroom.** Nothing about student join has been measured
because there was never enough upstream volume to see it. Measure that before building more.

## Addendum — student join was broken, not just unused

Written after the above. "Measure it before building" was the wrong call: three defects sat
on the path, and #2 means a guest student could not join at all.

1. **The join API 400'd any guest reaching its guest branch.** `route.ts` read
   `request.json()` twice — once in the guest branch for `guestName`, once below for
   `joinCode`. A `Request` body is single-use, so the second read threw `Body is unusable:
   Body has already been read` and returned `400 Invalid JSON` — *after* the route had
   already minted an anonymous auth user and written them a profile row: an orphaned
   identity and no membership. The two existing guest tests both asserted on state written
   *before* the second read, so the suite was green.
   **Scope, stated honestly:** this was almost certainly never hit in production.
   `useJoinClassroom` mints the guest session client-side and then POSTs *with* it, so
   `getAuthedUser` returns a user and the server guest branch is skipped — and the authed
   path only ever read the body once. Real bug, live trust boundary, but not the thing that
   was breaking joins. Fixed because the branch exists and is reachable by any caller that
   POSTs without a session.
2. **A hard reload tore down the join mid-flight.** `signInAnonymously()` emits `SIGNED_IN`
   with no prior user, which `shouldReloadAfterSignIn` could not tell apart from a real
   sign-up, so it fired `window.location.reload()`. But that event is guest *creation*, not
   the guest→registered upgrade the reload exists for — and the client mints the guest
   session as step one of joining. The reload raced the POST that followed it.
3. **The invite link demanded an account.** `/join/[code]` — exactly what
   `ClassroomManager` builds for teachers to hand out — bounced anonymous visitors to the
   homepage. Its sibling `/student/join` renders the same guest-capable form ungated. Same
   destination, opposite behaviour: recurring-pitfall **Class 3**.

Fixed all three. #2 is the one that was breaking live joins, and note its shape: a race
(Class 1 — `signInAnonymously()` resolving into a listener that could not tell creation from
upgrade) that failed *silently* (Class 4 — a reload looks like a page load, not an error), in
a flow whose low numbers were read as *low demand*. **A funnel stage with near-zero
conversion is a bug report until proven otherwise.**

What is still unverified: whether a guest join now completes end-to-end against the live
database. The three fixes are unit-verified, not integration-verified — the first real
student to use an invite link is the test.
