# Education Module Audit — 2026-04-25

7 expert lenses dispatched in parallel. UX + A11y completed via subagent. Pedagogy, security, perf/tech-debt, economy, analytics audited inline (subagent dispatch bouncing on prompt size).

Prior audit baseline (2026-03-22, partly stale): docs/audits/education-module-2026-03-22.md (file no longer present, only memory summary). 45/104 prior findings shipped; remaining big rocks were classroomGameManager replacement, Phaser duel grid, team play, starter pack expansion, curriculum browser mounting + seeded data, StudentDailyHub, FTUE overhaul.

---

## A — UX / IA / Brand (12 findings)

### P0
- **A1. Student daily landing missing** — `app/[locale]/student/PageClient.tsx`, `StudentHubPlayZone.tsx`. 3 zones (Play / Progress / Learn) but no daily ritual anchor. Add "Today's Challenge" daily-hub card. (S/M)
- **A2. Join-classroom flow has no preview/error UX** — `components/student/JoinClassroomForm.tsx`. 6-char code accepted, no classroom-name preview before commit, no clear retry. Add preview card + retry hint. (S)
- **A3. PostGameWordReview is a flex-wrap dump** — `components/education/PostGameWordReview.tsx`. Missed words ungrouped, "practice these words" CTA dead-ends. Group by lesson/difficulty + link to flashcard drill. (S)

### P1
- **A4. Empty state in MultiLessonSelector dead-ends teachers** — `components/education/MultiLessonSelector.tsx`. Add "Create Lesson" CTA → curriculum builder. (S)
- **A5. TeacherOnboarding doesn't auto-progress** — `components/education/TeacherOnboarding.tsx`. Final button dismisses; no nav to first-classroom flow. (S)
- **A6. EducationBreadcrumbs truncates lesson names** — `components/education/EducationBreadcrumbs.tsx`. Dynamic `[id]` shown as truncated UUID. Resolve from context/store. (S)
- **A7. ClassroomSetupStep grid breaks on small mobile** — `components/education/ClassroomSetupStep.tsx:~132`. `grid-cols-2 sm:grid-cols-4` cramps at 375px. Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` or scrollable tabs. (S)
- **A8. Teacher reports lack skeleton + error fallbacks** — `components/teacher/reports/*`. Blank screens during fetch. Add PageLoader + retry toast. (M)

### P2
- **A9. RTL shadow drift on EducationHeader** — `components/education/EducationHeader.tsx:~138`. Verify `shadow-hard-lg` flips correctly (project uses RTL auto-flip). (S)
- **A10. Mobile menu pane lacks neo-brutalist hard shadow** — `EducationHeader.tsx:~292`. Adds `shadow-hard-xl` + correct dark-mode border. (S)
- **A11. Selected-lesson summary missing** — `ClassroomGameLobby.tsx`. Show sticky confirmation card before "Start Game". (S)
- **A12. Inline SVG progress ring lacks `role="img"`** — `components/GlobalBottomNav.tsx:~320`. (XS)

---

## B — Accessibility (WCAG 2.1 AA, 10 findings)

### P1
- **B1. "Select All" target too small for TV/kids** (SC 2.5.5) — `MultiLessonSelector.tsx:83-94`. `px-3 py-1` ≈ 24px. Bump to `px-4 py-2.5`. (XS)
- **B2. Streak/+XP signaled by color only** (SC 1.4.1) — `StreakBonusIndicator.tsx:151-153`, `XpProgressBar.tsx:154-165`. Lime-on-pink/black collapses for protan/deutan users. Add icon prefix or text label. (S)
- **B3. Achievement tier contrast under 4.5:1** (SC 1.4.3) — `AchievementProgressCard.tsx:44-63`. Silver `bg-neo-white/60 + text-neo-white/80` ≈ 2.5:1. Use saturated tier colors on navy. (S)
- **B4. LevelUpCelebration confetti ignores reduced-motion** (SC 2.3.3) — `LevelUpCelebration.tsx:105-121`. `fireLevelUpConfetti()` has no `prefers-reduced-motion` gate. Verify `AdaptiveMotion` skips path. (S)

### P2
- **B5. Lesson buttons lack `focus-visible` ring** (SC 2.4.7) — `MultiLessonSelector.tsx:108-119`. TV at 10ft = invisible focus. (XS)
- **B6. Toasts use `aria-modal="false"` w/o live-region role** (SC 4.1.2) — `AchievementUnlockModal.tsx:106-107`. Switch toast to `role="status" aria-live="polite"`. (XS)
- **B7. Game-mode radios missing `radiogroup` semantics** (SC 2.4.3) — `ClassroomSetupStep.tsx:74-100`. Wrap in `<fieldset><legend>` or add `role="radiogroup" aria-labelledby`. (XS)
- **B8. Achievement emoji icons unlabeled** (SC 1.1.1) — `AchievementProgressCard`, `AchievementUnlockModal`. Add `aria-label` per icon. (XS)
- **B9. Animated XP gain not announced** (SC 4.1.2) — `XpProgressBar.tsx:154-165`. Wrap `+{recentXpGain}` in `role="status" aria-live="polite"`. (XS)
- **B10. Modals don't propagate `dir={dir}`** (SC 3.2.1, RTL bidi) — multiple. Add explicit `dir` on dialog roots. (S)

---

## C — Pedagogy / Learning Design (verified inline)

### P0
- **C1. Spaced-repetition exists as API route + handler but UI has no "Review Due" surface** — `app/api/education/spaced-repetition/route.ts`, `components/education/ReviewDueBadge.tsx`. Badge component exists but no centralized review queue. Without a daily review CTA the SR algo is wasted; only ~10–20% of the learning-effectiveness gain lands. Add review queue to StudentDailyHub (dovetails with A1). (M)
- **C2. No interleaved practice / recall-vs-recognition mix** — `educationXpManager.ts:23-86`. 5 practice modes (flashcard, matching, spelling, blitz, solo_board) but no curriculum-driven adaptive selection. All-flashcard sessions = recognition only; spelling forces recall but is opt-in. Add a "smart practice" entry point that interleaves modes per Bjork's desirable-difficulty research. (L)

### P1
- **C3. Lesson-completion feedback is XP-first, mastery-second** — `LessonMasteryToast.tsx`/`LevelUpCelebration.tsx`. File comment in `educationXpManager.ts:11` warns "Mastery messages appear BEFORE XP amounts (research pitfall 1)" — confirm in render order. If XP toast wins z-index on mobile (`z-[80]`), mastery loses. Audit. (S)
- **C4. Difficulty scaffolding missing inside a lesson** — `lib/education/starterLessonPacks.ts` (single 364-line file = limited content) + `lib/supabase/education/lessons.ts`. No within-lesson difficulty band; cards are uniform. Duolingo/Khan tier each unit by skill node. Add per-card `difficulty` + adaptive ordering. (M)
- **C5. Teacher reports lack actionability** — `components/teacher/reports/ProgressReportPDF.tsx` (478 lines), `ClassProgressReport.tsx` (360 lines). Reports show "what" (XP totals, completion %) but not "what next" (which students are struggling on which words, suggested intervention). (M)

### P2
- **C6. FTUE: student first-success path is >5 clicks** — student → join → enter code → wait → see classroom → pick lesson → start. Compare Prodigy: enter code → first question in <30s. (M)
- **C7. No clear distinction between "learning" and "playing"** — student sees same surfaces for practice, lessons, duels, classroom. Adopt Duolingo's "lesson tree" mental model or Khan's mastery dashboard. (L)

---

## D — Economy / XP Balance (verified vs `educationXpManager.ts`)

XP config is well-designed: server-side, mastery-focused, anti-grind cap on Blitz (`BLITZ_MAX_SESSION_XP: 180`).

### P1
- **D1. Streak multiplier 7d→1.5x, 14d→1.75x, 30d→2.0x is steep but breaks instantly on miss** — `educationXpManager.ts:44-48`. No grace day or "streak freeze" → loss aversion becomes pure punishment for kids. Add 1× freeze/week. (S)
- **D2. Education XP and main-game XP both feed `increment_player_xp`** — `app/api/education/record-xp/route.ts:78`. Single XP pool is fine, but no event-source tagging in DB → can't run cohort analyses (which features drive level progression). Add `source` column or event log. (S)
- **D3. Duel rewards: realtime win 250 / loss 150 / draw 175** — `educationXpManager.ts:51-55`. Loss = 150 = 60% of win, very generous. Tunable; consider 250/100/175 to widen win-loss delta. (XS)
- **D4. Achievement reward values not in this file** — verify in `educationAchievementManager.ts` (509 lines) that bronze/silver/gold/platinum follow a coherent 1:2:4:8 or similar ladder. Likely arbitrary. (S, audit-only)

### P2
- **D5. New-word bonus `NEW_WORD_BONUS: 25` (vs 15 baseline) is small** — `educationXpManager.ts:36`. Discovery is the highest-value learning signal; reward should be 2-3x baseline. Consider 40-50. (XS)

---

## E — Security / Child Privacy (verified inline)

Solid baseline: `record-xp` route has auth + 30/min rate-limit + xp clamp 1-1000 + activityType whitelist; `practice` route has Zod, auth, ownership check, server-computed XP (B7 fix landed). Classroom join uses `lookup_classroom_by_join_code` RPC (prevents enumeration). 6-char code from migration 056 = 36^6 ≈ 2.2B combos.

### HIGH
- **E1. `joinClassroom` lib path has no per-user/IP rate-limit** — `lib/supabase/education/classrooms.ts:186-255`. Called direct from client via Supabase JS, not via Next API → bypasses `apiRateLimit`. Brute-forcer can hit ~10 codes/sec from a botnet. RLS blocks read but the RPC is callable. Add rate-limit on the RPC (Postgres `pg_cron` or Supabase rate-limit extension). MEDIUM-HIGH risk. (M)
- **E2. Classroom join codes never rotate or expire** — migration `056_teacher_vocabulary_builder.sql:201-217`. A code leaked once = perpetual access. Add teacher-rotate UI + auto-expire after term. (S)

### MEDIUM
- **E3. `practice` route POST/PUT not rate-limited** — `app/api/education/practice/route.ts`. Inconsistent vs `record-xp` (30/min). Spam risk + DB bloat. Add rate-limit. (XS)
- **E4. Student PII in `getClassroomStudents`** — `classrooms.ts:314-364`. Returns username + `avatar_config` to anyone querying — assumed RLS-gated to teacher-of-classroom and members; **needs deeper review** to confirm RLS policy actually scopes by classroom_id. (S, audit-only)
- **E5. `award_education_xp` RPC reachable from 3 untested entry-points** — found in `practice/route.ts`, `classroomGamePersistence.ts`, `duel/{disconnection,gameplay,realtime}.ts`. Verify each clamps server-side; route already does, but socket-handler paths skip API → no `apiRateLimit`. (S)

### LOW
- **E6. PII in Sentry?** — `record-xp/route.ts:110` uses `captureApiError` with method only — clean. No PII observed in body capture; `needs deeper review` across other education routes' Sentry calls.

---

## F — Analytics / Telemetry (THE biggest gap)

**Critical: zero `posthog.capture` / event tracking calls across `components/education/**`, `app/[locale]/{education,teacher,student}/**`, `app/api/education/**`, `lib/supabase/education/**`.** Only result was `app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx` (teacher-facing report, not telemetry).

### P0
- **F1. No telemetry in entire education tree** — `components/education/**`, `app/api/education/**`, `lib/supabase/education/**`. Cannot answer: do students return D1/D7? do teachers complete onboarding? where do students drop off in classroom-game flow? Wire PostHog `capture` at: practice start/complete, classroom join/start/end, teacher-onboarding step, achievement unlock, lesson load, XP awarded (with source). (M)

### P1
- **F2. XP outcome events never logged client-side** — backend RPC `increment_player_xp` returns `new_total_xp + new_level`; client gets it back from `record-xp/route.ts:103-108` but doesn't `capture('education_xp_awarded', {source, amount, newLevel})`. Memory note from prior audit ("RPC returns void") is outdated — verified RPC returns row; client just doesn't fire. (S)
- **F3. Teacher funnel uninstrumented** — signup → onboarding → first classroom → first lesson → first student. No way to compute drop-off. Add events. (S)
- **F4. Student funnel uninstrumented** — join → first lesson → first XP → return D1/D7. (S)
- **F5. Failure events absent** — XP RPC errors, socket drops mid-classroom-game, lesson-load fails. Sentry catches exceptions, but PostHog needs `error` event for product-side correlation. (S)

---

## G — Performance / Tech Debt (verified line counts)

### P0 (file-size-rule violations: max 500 lines)
- **G1. `components/education/EducationHeader.tsx` 617 lines** — split into `<EducationHeaderDesktop>` + `<EducationHeaderMobile>` + nav-config helper. (M)
- **G2. `app/[locale]/student/profile/PageClient.tsx` 578 lines** — split achievement-grid + xp-summary + stats sections. (M)
- **G3. `lib/supabase/education/challenges.ts` 560 lines** — split daily/weekly/streak responsibilities. (M)
- **G4. `components/education/duels/RealTimeDuelGame.tsx` 519 lines** — split timer + grid + opponent panel. (M)
- **G5. `backend/modules/educationAchievementManager.ts` 509 lines** — split unlock + progress + tier helpers. (M)
- **G6. `components/education/ClassroomLeaderboard.tsx` 505 lines** — split row + filters + skeleton. (M)
- **G7. `app/[locale]/blog/word-games-for-kids-education/content.ts` 637 lines** — content file, less critical, but exceeds rule. (S)

### P1
- **G8. 17 direct `motion` imports from framer-motion across education** — `EducationBadgeGrid`, `PostGameWordReview`, `XpProgressBar`, `StreakBonusIndicator`, `AchievementUnlockModal`, `MilestoneCelebration`, `OpponentProgressBar`, `DuelDisconnectOverlay`, `DuelHistory`, `WobbleJellyCard`, `PulseGlow`, `WordOfTheDay`, `student/PageClient`, `student/profile/PageClient`, plus 3 `challenges/`. Project memory says LazyMotion sweep is top perf priority. Convert to `m.` + `LazyMotion features={domAnimation}` boundary. ~80kb gzipped initial bundle reduction expected. (M)
- **G9. classroomGameManager still load-bearing** — `backend/modules/__tests__/classroomGameManager.test.ts` exists; handlers `gameStartHandler`, `classroomGameHandler`, `classroomGamePersistence` reference the manager. Prior audit's M1 (replace with tagged MP rooms) NOT shipped. Re-confirm scope before next sprint. (L, design-first)
- **G10. Untested logic-heavy components** — `EducationHeader.tsx`, `MultiLessonSelector.tsx`, `ClassroomSetupStep.tsx`, `ClassroomGameLobby.tsx`, `TeacherOnboarding.tsx`, `EducationBreadcrumbs.tsx`, `PostGameWordReview.tsx`, `ClassroomModeBanner.tsx`, `ReviewDueBadge.tsx` — no `.test.tsx` counterparts. TDD rule violations. (M)
- **G11. Teacher pages eager-loaded** — `app/[locale]/teacher/{classroom,curriculum,reports,profile}` not behind `dynamic()`. Lower-traffic than student → dynamic-import candidate. (S)

### P2
- **G12. `app/api/education/practice/route.ts` 421 lines, `templates/route.ts` 360 lines** — close to limit, monitor. (XS)

---

## Synthesis — Top 7 to ship next sprint

| Priority | Item | Why now |
|---|---|---|
| 1 | **F1 — Wire PostHog across education** | Without telemetry every other audit finding becomes guesswork |
| 2 | **C1 — Daily review queue (combine w/ A1 StudentDailyHub)** | Activates the SR backend already shipped; biggest learning-effectiveness lever |
| 3 | **G8 — LazyMotion sweep on education** | One PR, measurable bundle drop, unblocks framer-motion infra goal |
| 4 | **E1 + E2 — Classroom join code rate-limit + expiry** | Live security risk, low effort |
| 5 | **B1+B2+B3+B4 — A11y P1 batch (TV target, color-only, contrast, reduced-motion)** | One a11y sprint sweeps 4 WCAG blockers |
| 6 | **G1–G6 — File-size split sweep** | TDD rule debt; pre-req for further feature additions in those files |
| 7 | **C5 — Actionable teacher reports** | Differentiator vs Khan/Prodigy; teacher retention lever |

## Notes
- Subagent dispatch hit "Prompt is too long" repeatedly during this audit; pedagogy/security/perf/economy/analytics were synthesized inline from targeted reads. UX + a11y sourced from completed subagents.
- File-line counts verified via `wc -l` 2026-04-25.
- Key XP/economy file paths and line numbers verified against current code, not memory.
