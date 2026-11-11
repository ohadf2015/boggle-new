# Education module: audit findings and rebuild plan (2026-11-10)

Base: origin/master 239bb91f4. Builds on `docs/education-audit-2026-11-08.md`; this pass adds
production numbers and picks what to build.

## What the data says (prod, last 90 days, test accounts excluded)

| Step | Teachers | Step conversion |
|---|---|---|
| Signed up | 110 | |
| Made a class | 64 | 58% |
| Got a student in | 29 | 45% |
| Ran a live game | 18 | 62% |
| Ran games on 2+ days | 3 | 17% |
| Active in 2+ weeks | 1 | |

- Median students per non-empty class is 1: most classes are the teacher testing alone.
- No lasting paying teacher. One subscription, now past due, zero rounds played.
- Pro offers: about 640 impressions in 60 days, 2 clicks, both on the class report button.
  The dashboard banner had 448 impressions and 0 clicks.
- Students: 87% guests, about 10% seen again.
- Rounds by mode: classic 36, vocab quiz 18, everything else single digits.

`classroom_rounds` only starts 2026-10-08, so older cohorts under-count games.

## Diagnosis

1. **Setup leaks before anyone plays.** The teacher's own words, the thing competitors
   cannot match, are never asked for: a starter pack is assigned silently. More than half
   of the classes that get made never get a student in.
2. **Pro gates the proof, not the depth.** The whole analytics page is locked, so a free
   teacher never sees per-student data working. Free caps (3 classes, 50 students) never
   bind. The checkout explainer sells "unlimited students" and "no ads", which free already
   has; three files state three different student limits.
3. **The student meta-game is hidden.** The reward chest is a small header button, the
   power-up shop sits inside a collapsed "More", guests see no level or streak, and a
   losing student gets a catch-up bonus worth under one point.
4. **Teacher home stacks about 13 sections and several Pro asks** under the approved class
   desk hero.
5. **Security debt inside the module:** socket teacher actions trust a client-supplied
   user id; student names reach the projector unfiltered.

## Moat and reason to subscribe

The defensible asset is per-student, per-word history that accumulates across sessions on
the teacher's own word lists, in six languages including Hebrew. It resets to zero on any
competitor. So:

- **Free** shows the proof: this week's "who needs help" and hardest words, for one class.
- **Pro** sells the depth that grows with use: multi-week trends, per-student reports,
  printables, missed-word practice, all classes.

Price, class cap, student cap and assignment cap are unchanged. Those are owner decisions.

## What gets built

### Phase 1: teacher setup
- Access form: unchanged. The required reason was restored on purpose on 2026-11-10 after
  a week of empty reasons, and the "42% never make a class" figure counts teachers who had
  already passed the form, so the form is not what loses them.
- First-class screen: optional "Paste your words" field. When filled, the class's first
  list is the teacher's words instead of the starter pack; when empty, behavior is
  unchanged and the screen says a starter list will be added.

### Phase 2: Pro truth and gate flip
- One source for plan limits (`freeTierLimits.ts`); plan matrix, feature list, tier config
  and checkout explainer derive from it. Guard test fails on a second literal.
- Checkout explainer lists only what Pro adds.
- Analytics page: free teachers see this week's roster pulse and the 3 hardest words for
  one class; trends, per-student drill-down and exports stay behind `ProGate`.
- Host results: the locked "Unlock report" button becomes the free 3-hardest-words insight
  with one upgrade link for the full report.
- Teacher home: one Pro slot. The dashboard banner and duplicate rail asks go; billing
  state banners (payment failed, trial ending) stay.

### Phase 3: student fun
- Results: chest becomes a full-width beat right after rank; the round shop moves out of
  the collapsed "More".
- Underdog: bottom-quartile finishers get a chest tier-up (same path as the boss-win
  tier-up); catch-up bonus has a 1-point floor and is shown when it pays.
- Guests see level, streak and chest in the lobby HUD.
- Not changed: the learn-words-then-ready gate (shipped at owner request 2026-11-06).

### Phase 4: safety
- Socket teacher actions take the user id from the authenticated socket, never the payload.
- Classroom join rejects profane names server-side with the existing `isProfane`.

### Phase 5: refactor (runs after phases 1 to 4; its files overlap theirs)

Module size for scale: `components/education` 529 files / 61.6k lines, `components/teacher`
233 / 26.9k, `lib/education` 325 / 35k, 58 education API routes.

- **Delete dead code**, each re-checked with a full-repo importer grep before removal:
  `lib/supabase/education/teacherExportAllClasses.ts`, `hooks/useLessonTemplate.ts`,
  `hooks/useTeacherTrialChecklist.ts`, `hooks/useClassroomAnalytics.ts`,
  `components/teacher/analytics/AnalyticsDashboard.tsx`, `components/teacher/hq/ClassCarousel.tsx`,
  `components/teacher/hq/useCalmMotion.ts`, `components/teacher/home/HomeInsightCard.tsx`,
  `HomePracticeCard.tsx`, `components/education/ScrollRevealSection.tsx`,
  `landing/LandingFaq.tsx`, `lesson-creation/splitImportLines.ts`,
  `components/education/ClassSetupStart.tsx`, plus their tests.
- **Legacy classroom surface.** `/multiplayer?classroom=true` still carries its own banner
  and results card (about 1,600 lines: `ClassroomModeBanner*`, `ClassroomResultsCard*`)
  beside the live route's `EduHostResults` / `EduStudentResults`. Delete only if the
  legacy entry provably always redirects to `/education/live`; otherwise leave and record
  the blocker.
- **Join refusals.** `classroomGameError` is emitted with three payload shapes; emits
  without a `code` show students a generic "retry". Every emit carries a `code`, and the
  client and server share one refusal map.
- **Split files over 500 lines** that this pass touches: `join/useJoinFlow.ts` (501),
  `lib/supabase/education/leaderboard.ts` (502), `challenges.ts` (585).
- Collapse the teacher home's eight billing hooks into one `useTeacherBanner` selector
  (built in phase 2).

Left for a later pass, each too wide to do safely here: one seating door for `join` vs
`joinClassroomGame`, merging `EducationHeader` with `EducationShell`, the five
reduced-motion hooks, six telemetry modules, about 390 off-token color classes.

### Phase 6: social and competitive play, built on what only LexiClash has

Students here make words on a letter grid with the teacher's words hidden inside it.
Multiple-choice games have no shared hidden thing to race for. Runs after phases 3 and 4
release the socket handlers. No database migration; all outcomes are decided on the server
and phones only display them.

**6a. Lesson Word Race.** The teacher's hidden words are a shared list on the projector and
on every phone, shown as first-letter masks. The first student to find each one claims it.
- Server: new `backend/modules/lessonClaims.ts`. On an accepted word that is `fromLesson`
  and `isFirstFinder` (both already computed in `wordValidationHandler.ts`), broadcast
  `lessonWordClaimed` with word, name, avatar, claimed count and total. Claim bonus +3
  (constant in `shared/constants/lessonScoring.ts`); later finders still get the normal +5.
  The claimed list rides in the round-start extras so join and reconnect restore it the
  same way. In team mode the claim also credits the claimer's team.
- Projector: the masked slot flips to the word with the claimer's avatar and name; the
  "7/12 claimed" count pulses. At most 12 words shown.
- Phones: claimer gets a "claimed" burst; everyone else gets a toast ("Noa claimed PHOTON")
  and the slot shows taken.
- Reactions: the existing fixed-emote reactions (seven ids, no free text) are mounted
  in-game so classmates can react to a claim.
- Off when the round has no lesson deck or fewer than 2 human players.

**6b. Rival Pairs.** Each student gets one skill-matched rival for the round.
- Server: new `backend/modules/rivalPairs.ts`. At round start sort by the ability levels
  team assignment already uses and pair neighbours (a trio when odd; across teams in team
  mode; default level for guests). Each student is told their rival privately and it is in
  the round-start extras for reconnect. When a student passes their rival the server sends
  `rivalFlip`. A rival who leaves triggers re-pairing.
- Phone: a pinned chip, "vs Dana −4", live during the round.
- Projector: a ticker naming only the student who won the moment ("Maya took her duel").
  Never who was passed, never a full ranking.
- Teacher toggle `settings.rivalry`, default on, beside the economy toggle.

**6c. Lesson words crack the boss.** In Boss Battle a lesson word found during the exposed
window is a critical hit the class sees in the hit feed, tagged as a lesson hit.

Rejected after reading the code: a chest pick mid-round in board modes (stops the swiping);
reviving duels (2,900 lines of separate handlers, never used).

## Out of scope (stated, not built)
Route-group separation, class subdomain, Google Classroom grade passback, practice sandbox
rebuild, lesson words as lasting locker cards, new curriculum packs, annual plan. Each is larger than
this pass and several need owner decisions.

## Testing
TDD per behavior. Vitest related-files while building; one full run plus lint and build
before merge. Scanning tests are named `*.guard.test.ts`. New strings land in all six
locales in the same change. Visual check on a local stack at phone and projector widths,
with `@lexiclash.test` accounts only; nothing is created on production.

## Measurement
`GR-Intervention` lines on the PR: teacher setup (funnel_conversion), analytics gate
(conversions), student results (frustration).
