# Duolingo-grade polish: simpler screens, satisfying motion

Worktree `../boggle-wt-duo1125`, branch `feat/duo-polish-1125` off origin/master.
Before shots (390x844 prod): `~/.cache/lexiclash/duo1125/before/*.png`.

## What we saw on prod (phone)
- Home: avatar hero + headline + subline + 2 big cards + 5 mode tiles + streak card all above/near the fold. Seven equal-weight choices; no single "play" action.
- "Get the App" sheet covers the bottom third of Daily, Profile and Blast on first load, before the user has done anything.
- Daily hub: title, three-line explainer, progress card, tip banner, hero card, grid. Four layers of text before the first game.
- Solo game: helper line, words drawer, progress ladder, rival label, keyboard hint chip, three-button row. Readable but busy.
- MP lobby and Profile: fairly clean; buttons and cards use different press styles.

## Principles (Duolingo, in our neo-brutalist skin)
1. **One primary action per screen**, big, thumb-reachable; everything else visibly secondary or one tap away.
2. **Chunky 3D press**: every tappable card/button has a solid bottom lip (hard shadow); press sinks it (translateY = lip, lip → 0) in ~80ms; release springs back. One shared primitive, not per-screen CSS.
3. **Cut copy**: one short line under a heading at most. Explainers move behind a "?" or into the game's first-run coach.
4. **Feedback on every success**: spring pop on the thing that changed, numbers count up, progress bars fill with a spring and a shine sweep.
5. **Earned celebration**: end of a game/day = a single moment (mascot hop, count-up, streak flame) then one CONTINUE button.
6. **No interruptions**: install/upsell prompts never on first paint; only after a finished game, at most once per session.
7. **Motion budget**: transform/opacity only; UI ≤ 300ms; springs from one token set; `prefers-reduced-motion` = static; no opacity-0 entrance on fullscreen layers on mobile (pitfall class 5); frame-pacing check on the heaviest screen.

## Animation stack decision
framer-motion 12 (already shipped) for springs, layout and presence; canvas-confetti for bursts; GSAP stays where it is. **No Rive runtime**: we have no .riv sources, the Rive MCP is down, and authoring a state-machine file is a design job. "Rive-style" mascot life (idle breathe, blink, squash-and-stretch hop, reaction states) is built as a framer-motion `MascotRig` over the existing mascot art, with a state prop so a real .riv can replace it later behind the same API.

## Areas (disjoint ownership)
| # | Area | Owns |
|---|------|------|
| A | Foundation (runs first) | `components/motion/**`, `components/ui/button.tsx`, `components/ui/neoStyles.ts`, motion tokens in `app/globals.css` |
| B | Home | `components/home-preview/**` (the live home tree), `components/landing/**`, `app/[locale]/PageClient.tsx`, `app/[locale]/(home)/**` |
| C | Daily hub + daily games/results | `components/daily/**`, `app/[locale]/daily/**` |
| D | Solo (classic/quick-play) + Blast intro/results | `components/singleplayer/**`, `components/blast/**`, `app/[locale]/quick-play/**`, `app/[locale]/singleplayer/**`, `app/[locale]/blast/**` |
| E | Multiplayer lobby/room/results | `components/multiplayer/**`, `app/[locale]/multiplayer/**`, `app/[locale]/join/**` |
| F | Profile + chrome + interruptions | `app/[locale]/profile/**`, `components/profile/**`, `components/PWAInstallPrompt.tsx`, `components/AndroidAppInstallPromo.tsx`, `components/android-install/**`, `components/GlobalBottomNav.tsx`, `components/Header.tsx` |

Shared-file needs (translations, other folders) go to `scratchpad/<area>-requests.md`; the coordinator applies them. Translation keys: builders may add keys to every locale file, appending only (coordinator resolves conflicts).

## Gates per area
- Related tests + eslint on owned files green; no `tsc` by builders (coordinator runs it once).
- Every new string in all locales; no hardcoded colours (neo-* tokens).
- Analytics event names and SEO title/meta/H1 text unchanged.
- Before/after phone screenshot from local dev, judged on what a user sees.

## Order
A → (B, C, D, E, F in parallel) → independent review (diff + failure classes) → fixes → tsc + full suite + build → PR → merge on green → deploy check → after shots from prod.

## Owner approval gate (owner asked 2026-11-25)
No commit to master / PR merge until the owner approves the new UI. After builders pass gates: publish a before/after review page (phone, RTL, TV per screen) + the local dev URL (http://localhost:3417), collect per-screen approve/change notes, apply changes, then PR per area.
- Owner add (2026-11-25): clean screens with cool background elements → Foundation `AmbientBackdrop` (flat large shapes, slow drift, per-area theme); screens drop filler card chrome.

## Priority by traffic (PostHog $pageview, unique users, 28d to 2026-11-25, host lexiclash.live)
1. Multiplayer lobby/room (E): /multiplayer 389 + /join 58
2. Home (B): / 369
3. Solo game (D): /quick-play 187 + /singleplayer 56
4. Daily (C): /daily 160 + /daily-word-wheel 33
5. Word pages (G, added): /words 333 — SEO entry pages; polish layout only, title/meta/H1 frozen. Owns components/words/**, app/[locale]/words/**
6. Profile + chrome + install prompt (F): /profile 29 (but install sheet hits every page)
Education/teacher (145+59+41) left out: paid surfaces, separate pass.
Wave 1 = E, B, D right after Foundation; wave 2 = C, G, F as wave 1 slots free.

## Teacher module added (owner, 2026-11-25)
Area H: education/teacher/student — owns components/education/**, app/[locale]/teacher/**, app/[locale]/student/**, app/[locale]/education/**, app/[locale]/classroom/**. Traffic 28d: /education 145 + /student 59 + /teacher 41 users (245 combined, rank 3 overall).
Extra rules for H: keep every trial/checkout/Pro CTA and its events; TV-wall lobby uses CSS zoom (pitfall class 5: fit by container queries); eduTranslationKeysResolve.guard test must stay green; teacher screens are dense tools — simplify hierarchy and press feel, don't hide classroom controls.
Revised order: wave 1 = E (MP), B (Home), H (Teacher module); wave 2 = D (Solo), C (Daily), G (Words), F (Profile/chrome).
Teacher module split into two owners (154 components):
- H1 Teacher (teacher home, class setup, live host/lobby/projector, results): app/[locale]/teacher/**, app/[locale]/education/live/**, components/teacher/**, components/education/{lobby,live,projector,controls,shell,results,pickers,practicePicker}/, root components/education/{Teacher*,Class*,Lesson*,FirstClass*,FirstGame*,GamePaused*,District*}.
- H2 Student + education landing: app/[locale]/student/**, app/[locale]/classroom/**, app/[locale]/education/** except live, components/student/**, components/education/{join,practice,landing,rewards,achievements,economy}/, remaining root components/education/* files.
- Classroom game-mode subdirs (boss, duels, missGap, teamTiles, unplugged, vocabQuiz, academyModes, classicUnplugged, help, motion) unowned this pass: request-file only.
Wave 1 = E, B, H1, H2.

## Progress
- 2026-11-25 Foundation done (gate PASS); AmbientBackdrop in progress. Wave 1 builders launched: mp, home, teacher, student. API: ~/.cache/lexiclash/duo1125/FOUNDATION-API.md

## Merge checklist (after owner approval)
- Home redesign makes solo PLAY the only primary, which is the treatment arm of Growth Radar experiment `lexiclash-hero-play-cta` (live since 11-23, 53 vs 73 exposures, inconclusive). Home builder removed its flag read in PlayHero; lib/experiments/heroPlayCta.ts stays for entry pages. At merge: conclude/stop that experiment (note entry-page Play-now bars share its population) — put this on the approval page.
- Commit components/ui/__tests__/__snapshots__/button.defaultClasses.guard.test.tsx.snap (CI won't write it).
- Ownership update: solo (D) also owns components/quick-play/**, components/daily/WordWheel*.tsx, components/game/KeyboardHintTooltip*. Daily (C) must NOT edit those.
- RAM cap (owner 2026-11-25): max 3 builders active (mp, home, teacher); student + solo paused with STATE.md; gate.sh global lock, 1 vitest worker; queue: student, solo, daily, words, profile.
- Foundation final (NaN fix, cream tone, backdrop outline+letters): own tests + lint green, NO full gate pass — the coordinator's full suite at the end is the first whole check.
- Home done (gate PASS). Follow-ups sent: avatar island empty on local, backdrop tile under PLAY. Coordinator TODO at end: drop unused keys homePlay.friendsSub/timerBadge/quickGame after grep; conclude experiment lexiclash-hero-play-cta. Student resumed (active: mp, teacher, student).
- Home final (gate PASS 164 tests): avatar island 108→92px fix; missing avatar on local was stale SW + dev chunk 404s, not our diff; backdrop constrained via hero wrapper, 0 overlaps at 390/1920 en+he. Queue next: solo (paused), then daily, words, profile.
- Teacher done (gate PASS 3007 tests): digest/notice moved below desk, chunky press, projector SpringProgress cream, hardest-words merged into missed chips. Not done: class setup/reports/curriculum; signed-in home not seen live. Guards loosened for [data-ambient] in ProjectorLobby. Solo resumed (active: mp, student, solo).
- Queue order now: solo (running), daily, words, profile, then teacher pass 2 (class setup, reports, curriculum) via duo-teacher.
- Student done (gate PASS 776): join hint dropped, SEO landing banner removed (dupe of H1), backdrop lg+ only, XP bars SpringProgress. TODO coord: delete education.student.join.codeHint x6; install sheet covers edu hero → area F. Daily launched (active: mp, solo, daily).
- Solo pass 1 done (gate PASS 191). Added blast.ready.tagline x6 (coordinator). Solo pass 2 running: owns components/daily/WordWheel*, components/game/**, components/results/stage/ResultsNextBar* for the HUD items. Active: mp, solo, daily.
- Daily done (gate PASS 191): strip/hero/list/leaderboard calmer, explainer in How-it-works disclosure. Coordinator added daily.hub.{tagline,howItWorks,newcomerChip} x6. TODO drop daily.hub.newcomerTip/dismissTip. Words launched. Active: mp, solo, words.
- MP done fully (gate PASS 950): results NEXT UP→chip, daily promo only after series, podium+my card own first screen. Profile/chrome/install launched. Active: solo, words, profile. Then teacher pass 2.
- Solo done (gate PASS 478): hint once ever (flag at show time), rival label off phone ladder, empty strip collapsed, one keyboard hint, ResultsNextBar chunky. Teacher pass 2 started. Active: words, profile, teacher.
- Words done (gate PASS 41): SEO head+JSON-LD+h1 text byte-identical on 4 pages; one primary CTA; reveal-at-opacity-0 removed; RTL tile reversal fixed. Follow-up running: seed-words cleanup (proper nouns). Active: words(fu), profile, teacher.
- Teacher pass 2 done (gate PASS 3102): one lime Start per classes page (changed an earlier 'every card lime' test → OWNER CONFIRM on review page), chunky press on create/invite, report bars SpringProgress. Coordinator deleted unused keys x6: homePlay.{friendsSub,timerBadge,quickGame}, education.student.join.codeHint, daily.hub.{newcomerTip,dismissTip}.
- Words follow-ups done: 545 junk seed words removed (guard), X refilled to 19 real words (≥10 per letter guard), Y counts as vowel in shared/utils/wordShapeFilter.ts (also affects MP + bots → ship as its own bugfix PR).
- Profile done (gate PASS 234): install promos gated to after-a-game-this-session, off play routes, once/session; PWA → top toast; guest profile one SIGN IN; nav tab spring. OWNER DECISION: ends exp-install-promo-after-first-game-v1 (proj. ~14 vs ~28 installs/30d). Gate pathspec hole: file-prefix args matched nothing → coordinator runs whole-repo lint+tsc+suite. Header press → profile; hill prop → foundation. Deleted profile.backToLobby.
- Review page published (private): https://claude.ai/artifact/7gvPwA33jNhULBEwn1d4hT. Lint 0 (201 files), tsc 0 after fixing SoloGameLayout stale prop. Full suite running → /tmp/duo-final-test.log. Then build. Awaiting owner approval per screen.
- Full suite: 6196 files pass, 2 FAIL (WordWheelGame.coverageCelebration x3, rivalSelfFilter x2): solo's gate prefix matched nothing. Sent to solo. Bg-task said exit 0 but TEST_RC=1 (wrapper masking). Next: build (stop dev server first, .next shared).
- Solo fixed 5 failures (stale tests). Verified: coverageCelebration fails on clean origin/master too (pre-existing red, CI didn't catch) → ship test fix in solo PR. Build running → /tmp/duo-final-build.log (dev server stopped; restart after).
- Build PASS (BUILD_RC=0, fresh BUILD_ID). Final: lint 0, tsc 0, suite green after solo test fixes, build 0. Dev server restarted on :3417. WAITING: owner approval per screen + 4 decisions on review page. Then per-area commits/PRs (ask before commit per repo rule).
- 2026-11-26 owner review: "teacher screens and daily challenge pages aren't there yet". Before/after nearly identical (trim, not redesign). Pass 3 sent to duo-daily (Duolingo path: hero on backdrop + round node path + 1-line leaderboard) and duo-teacher (no greeting card, one hero + lime primary, code chip, merged stat strip, compact class rows). Target ≤6 above-fold groups. Shots → after/v3/.
- 2026-11-26 pass 3 results: Teacher gate PASS (515 files/3714 tests): home 8→5 groups, no slab/bubble, code chip, merged stat strip; classes compact rows; new-class form unboxed. Daily: hero on backdrop + round node path, 9→6 groups, done state; coordinator added daily.hub.{todayCount,boardYou,boardTop} x6 + i18n rebuild. Review page v2 published. Next: daily final gate, then full tsc/suite/build.
