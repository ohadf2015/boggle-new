# Gauntlet Backlog — deferred items from critic rounds

## From P1 (nav integrity)
- [ ] `app/[locale]/multiplayer/PageClient.tsx` is 930 lines (cap 500, pre-existing). Next touch should extract `useClassroomRoomGuards` (defer refs + handleRoomGone + flush effect ≈100 cohesive lines) — also makes wiring behaviorally testable via renderHook instead of regex contracts.
- [ ] Two pending-policies undocumented: host-left modal treats pending as classroom (pessimistic), user-initiated exits treat pending as arcade (optimistic). Defensible but needs one line of doc when the hook is extracted.
- [ ] `NotFoundClient.tsx:21` omits `search` — only consumer asymmetry, no practical gap today.
- [ ] Default classroom name "My Class" not localized (DB-seeded at creation) — shows English on Hebrew decks.

## From P2 (teacher HQ)
- [ ] Sheet interiors (HqSheet, LessonBuilder, HqToolsContent, HqProjectorSheet) — secondary surfaces behind the dock, need the refined-surfaces treatment.
- [ ] `EducationHeader` (shared across education routes) untouched by the calm redesign.
- [ ] `teacher/classroom` and `teacher/reports` still use the observatory bg — same calm-canvas treatment candidate (P3 will hit classroom).
- [ ] First-run double-gate (r2 #5): 5-step `TeacherOnboarding` walkthrough dismiss → then CREATE MY CLASS. Not collapsed in r2: the walkthrough is a shared education component with its own contract tests + telemetry funnel (`trackTeacherOnboardingStep`), and the noScroll suite source-pins the zero-classroom gate — collapsing is a product decision (explainer vs straight-to-action), not a small refactor.
- [ ] Pack testIds use `p.category`, so 5 packs share `play-now-pack-general` — duplicate testIds in one list (pre-existing; breaks any tooling querying packs by testid).
- [ ] Tools-sheet body still mounts while closed (r2 #6, lessons sheet fixed via `mountWhenOpen`): 7+ assertion sites across noScroll/playNow/hq/oneScreen/telemetry pin mounted-while-closed shortcuts and `pro-gate data-active` flips, and HqSheet documents the behavior as deliberate. Impressions are already gated (`data-active`, checklist self-gates), so the remaining cost is DOM size only — revisit as a dedicated cross-suite contract change.
- [ ] Test-teacher password reset to `P2critic!2026gauntlet` via admin API for r2 verification (account: p2critic-0929@lexiclash.test).

## From P1b (access-request 500)
- [ ] Twin-race 200 lie (route.ts:139-143): twin approved the row but twin's own promotion failed → this request sees approved row → plain 200 → "You're in!" → gate bounce. Rare²; self-heals on re-submit.
- [ ] Same partial-failure pattern candidates: `miss-gap/complete/route.ts:131→175` (streak upsert after run upsert commits), `admin/teacher-pro/route.ts:79` (!admin → generic 500).
- [ ] ~20 createAdminClient routes silently benefited from the trim fix — no action, noted for changelog.

## From P7 (pressure dials)
- [ ] TV/projector standings (ClassroomTvResults/TvLobbyView) consume no pressure — leaderboard=hidden keeps a projector-sized hole in a projected classroom. STATED deferral (P7 r2 critic); student surfaces shipped honest first.
- [ ] OBS-4 fallback path must carry dials: refused quiz start (thin lesson) → teacher START GAME launches classic in same room, and that fallback round ran with NO pressure applied (rank + clock despite hidden+gentle). When the fallback itself is addressed, thread pressure through it.
- [ ] Post-final-reveal semantics: final end screen is the reveal moment under hidden — if teachers want to re-hide after, that's a new dial state, not assumed.

## Cross-piece (final consolidation)
- [ ] Hebrew prefix-glue housekeeping: 11 PRE-EXISTING non-arc sites in translations/he.js glue ש/ל/ב/מ prefixes to {{interpolations}} (welcomeToTier, googleClassroomTitle, rematchWaiting, etc.) — same maqaf fix as P5-r2's arc sweep; extend arcHebrewMaqaf.test.ts guard pattern file-wide when picked up.
- [ ] Promote the truncation fs-contract (`academyLabelFit.test.tsx` pattern) repo-wide: components/teacher + components/student + components/practice, with a documented-keep allowlist (player name, island plaque, page h1). Design-system rule "the verb never truncates" already documented.
- [ ] RTL hero play icon direction on student hub — accepted YouTube convention; revisit only if users flag.
- [ ] Two lesson islands share the name "Transition Words - Band 2" (two lessons from one pack) — content-side dedup.
- [ ] Duplicate-default class creation also exists in PlayTabFirstRunCard.tsx (HQ first-run path) — reuse components/teacher/classroom/uniqueClassName.ts.
- [ ] Dead code: components/teacher/hq/ClassroomCard.tsx (zero consumers after P3) — hq-turf owner deletes.
- [ ] Hebrew cap-meter renders "STUDENTS 50 / 0" LTR word order (StudentCapMeter, pre-existing).

## Environment
- Dev server running on :3100 (started by P2 critic).
- Test teacher: p2critic-0929@lexiclash.test / P2critic!2026gauntlet, classes: CA3ZBR (renamed to 60-char probe name by P3 builder), QL8A67, DE9AJJ.
- Test student: p4student@lexiclash.test (password rotated mid-gauntlet — reset via admin API if auth fails).
- **Guest join broken (DB, not UI):** POST /api/education/join guest path fails `42704: type "user_role" does not exist` — migration drift on the dev Supabase project. Needs DB-owner attention. Corroborating drift: `42703 column profiles.email does not exist`.
- Review badge "10" floats detached from Missed Words tower art at 390px (pre-existing cosmetic).
- In-round feedback color unification across the other 7 practice modes (only flashcards done in P4 r1).

## Commit hygiene
- [ ] Per-piece staging checklist addition: after any surgical/partial staging of translations/*.js, RE-RUN `npx tsx scripts/build-i18n-assets.ts` and stage the resulting messagesManifest.json in the SAME commit. The manifest is content-hashed over the whole file, so a partially-staged translations state produces a stale manifest that only fails on clean checkouts (masked locally by the dev server regenerating). Cost us two failed P5 pushes (2026-09-30).
- Working tree contains uncommitted changes from concurrent sessions (audioLoader, deploymentChangelog.generated.json, translation-report.json, other teacher-HQ files?). Stage only gauntlet-owned files when committing.
