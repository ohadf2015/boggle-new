# Duolingo redesign, pass 2 (2026-11-26)

Worktree `../boggle-wt-duo1126`, branch `feat/duo-redesign-1126` off origin/master 8b9dd64ff (= prod today, checked `/api/version`).
Before shots (prod, 390x844 + 1440x900): `~/.cache/lexiclash/duo1126/before/*.png`. Screenshot script: `~/.cache/lexiclash/duo1126/shot.mjs <base> <outDir> "name|/path|phone,desk|waitMs" ...`.
Local dev: http://localhost:3418 (`env -u NODE_OPTIONS PORT=3418 npm run dev`, log /tmp/duo1126-dev.log). Backend has no hot reload.

## Owner ask
"Not good enough": more like Duolingo, clean and fun, few CTAs, high-quality animation and motion on all pages (teacher, results, home, gameplay). Critique + refactor, before/after. Bugs: fire round hides part of the board; board not centred; players can't change game mode between rounds; the pre-game mini-tutorial screen looks bad and isn't engaging.

## Critique of the shipped pass 1 (prod 8b9dd64)
- **Home (phone):** still 7 tappable choices above the fold (PLAY NOW, friends, daily, 4 mode tiles) and a dashed "ticket" daily card right under it. The avatar is a sad-face portrait in a ring with an edit pencil, not a mascot moment. Headline is 2 lines of marketing copy. Reads as a landing page, not a game.
- **Home (desktop):** two-column marketing hero; the art floats on the left with tiles cropped at the edge; big pink/orange cards below compete with PLAY.
- **Solo classic (phone):** board sits low with ~250px empty above and below; it's off-centre (48px left vs ~34px right plus shadow); the timer ring and score card float with no shared bar; the exit button is clipped at the top.
- **Quick-play (phone):** sound button sits on top of "0/36 CLEARED"; leaderboard chips cut off mid-name; board touches the edges; an info card floats under the board; the bottom 40% is empty.
- **Desktop game:** tiny 3-line "Find words fast to build a combo" hint; three different card styles in the left rail; keyboard-help box always on.
- **Teacher (signed out):** a sign-up form card, then a cyan "That page is for teachers" alert repeating the heading, then a bullet list. Three boxes saying the same thing.
- **MP lobby:** decent; the empty state takes the whole middle.
- **Pre-game (MP countdown):** a solid fullscreen overlay with a badge, a rule line, a coach demo and avatars all at once; no rhythm, no reveal.

## Design direction (keep brand: dark navy, Fredoka/Rubik, electric mode colours, mascot)
Duolingo traits we copy: one centred column; one giant chunky button per screen, pinned to the thumb zone; a character in every key moment; big rounded shapes with a soft 4px bottom lip (not black offset shadows everywhere); a thin full-width progress bar as the game HUD; lesson-complete style results (character + 3 stat tiles counting up + one CONTINUE); lots of empty space; motion that rewards (springs, pops, count-ups), never decorates for its own sake.

Global rules: ≤1 primary action per screen; ≤5 groups above the fold on a phone; transform/opacity only; springs from `components/motion/tokens`; reduced motion = static; no opacity-0 entrance on fullscreen layers on mobile; every new string in all 6 locales; neo-* tokens only; SEO title/meta/H1 text and analytics event names unchanged.

## Areas (disjoint ownership, ≤3 builders)
| Area | Owns | Delivers |
|---|---|---|
| PLAY (game screens + pre-game + fire/centring bugs) | components/game/**, components/earthquake/**, components/multiplayer/round/**, components/tutorial/**, components/quick-play/**, components/singleplayer/**, components/game/ModeRevealOverlay*, components/multiplayer/player/** | centred board everywhere (measured), Duolingo HUD (exit · progress bar · score), fire round never covers the board (rect check), new pre-game "get ready" stage |
| RESULTS (results + between-round mode change) | components/multiplayer/results/**, components/results/**, components/multiplayer/host/** (next-round only), backend/handlers/** + backend/modules touched by mode relay, hooks/useSeries*, MP results hooks | lesson-complete results (solo + MP), host mode picker live for all players, joiners see the pick, round 2 really runs the picked mode (2-player run) |
| HOME+TEACHER | components/home-preview/**, components/landing/**, app/[locale]/PageClient.tsx, app/[locale]/(home)/**, app/[locale]/teacher/**, components/teacher/**, teacher sign-up/auth gate components | Duolingo home (mascot + one PLAY + mode row), teacher sign-up one card, teacher home check |

Shared-file needs (translations, motion kit, globals.css) → `~/.cache/lexiclash/duo1126/requests/<area>-requests.md`; coordinator applies. Builders may append translation keys to all locale files themselves (append-only).

## Gates
`~/.cache/lexiclash/duo1126/gate.sh <area> <owned paths>`: eslint, hardcoded colours, t() keys, removed analytics events, related vitest (1 worker, global lock). Fails on an empty changed set. No tsc by builders. Coordinator runs tsc + full suite + build once at the end.

## Owner approval
Redesign does not merge until the owner approves the before/after review page. Bug fixes (fire round, centring, mode change) ship as their own PR once green.

## Progress
- 2026-11-26 plan written; before shots taken; dev server :3418.
- 2026-11-26 builders launched (opus): duo-play, duo-results, duo-home. Common brief ~/.cache/lexiclash/duo1126/BRIEF-COMMON.md, gate ~/.cache/lexiclash/duo1126/gate.sh. Next: per-builder review of diff + shots, bug-fix PR first, review page, approval.
- Owner add: quick-play in-game buttons look bad → sent to duo-play (one action bar: big chunky primary + equal round icon buttons).
- Env blocker resolved: owner had me link ../boggle-new/fe-next/.env.local; server restarted with env.
- Coordinator applied play request #1 (globals.css board frame lip 0 6px, RTL overrides dropped) — part of the bug-fix PR.
- duo-home reported done (gate PASS 253 tests; home tappables above fold 8→3, groups 7→4; teacher groups 5→4). Coordinator sent fix round: avatar chip overlaps bubble, empty band under friends link (rail should peek), H1 widow, teacher empty bottom. Decisions for owner page: Random removed from home; teacher home unchanged (already one hero); PublicTeacherPayCta CLS 0.426 pre-existing (file has other session's edits).
- duo-play reported done (gate PASS 1151 tests): fire chip in HUD (embers 19/81→0/53 in board), centring delta +3→0 all variants, GameHud bar, pre-game sequenced card/demo/avatars/countdown, groups 6→4. Pass 2 sent: quick-play action buttons (owner add), blast request #2 (ownership given), fire shot with new HUD, word-chip empty state, demo finger, verify bugfix.patch.
- duo-home pass 2 accepted (gate PASS 252): chip clear of bubble, rail peeks (50%), H1 balanced, teacher benefits pulled up. Home area DONE pending owner review.
- duo-results reported done (gate PASS 1019 + backend 26/26): host 1-tap next-mode chips, guest sees pick live (N→Y), round 2 runs pick; new updateNextMode/requestNextMode; teacher can pick via classroom mode switch (unit-only). bugfix.patch 17 files. Redesign: lesson-complete MP/solo results, groups 7→5. Owner decisions: emoji bar desktop-only; challenge/showdown/social moved behind See all words. Pass 2 sent: tie verdict, tied podium heights, 3rd tile zero state, solo dead band, confetti hydration, quick-play results hero.
- duo-play: quick-play action bar done (actionBar.ts, WheelActionBar shared with Daily wheel → owner flag). Sent: Wheel Rush HUD (qp/MP only, not Daily), clean wheel top, + pending pass-2 items 2-6.
- Review page v1 published (private): https://claude.ai/artifact/EQDP7DBkT4aNGoL5bknpoe — builder: ~/.cache/lexiclash/duo1126/review/build.py (pairs.txt → img/ → index.html). Republish after pass-2 shots (solo results, fire with new HUD, wheel top).
- 2026-11-27 OWNER: new home bad UI/UX; home 2 versions ago (prod 11-25) looked better but overloaded/too many choices → prioritise; new quick mode buttons bad (read as home mode rail; action bar kept, flagged); teacher sign-up = combine old life + new clean. Sent duo-home v3 brief (avatar-on-rays hero, one PLAY, Friends+Daily cards, old filled tiles row, single daily below). Memory: feedback-home-keep-personality.
- Owner 'new quick mode buttons look bad' also applies to the action bar (grey slab empty state) → duo-play: back to old compact navy SUBMIT + square chunky icons, lime pop when ready. Bug-fix branch fix/fire-centre-mode-switch-1127 committed (worktree ../boggle-wt-fix1127): lint 0, tsc 0, related 178 files green after intended snapshot update, guard 141 green, backend 26/26; build running /tmp/fix1127-build.log.
- Bug-fix PR #2198 opened (branch fix/fire-centre-mode-switch-1127, build RC 0). Watching checks → merge with --match-head-commit, then deploy check (/api/version). Redesign branch must later rebase onto master incl. #2198 + #2196.
- duo-results pass 2 accepted (gate 1966): verdict table, tied podium, 3 tiles, confetti mount-gated at source, quick-play on shared mascot hero. Sent: solo results empty band layout fix + confirm #2196 rules.
- #2198 MERGED f538247a6 (all checks green on 7811d8e). Deploy watch running. TODO after deploy: prod check, remove ../boggle-wt-fix1127.
- duo-play action bar redo accepted (compact navy SUBMIT 48px + square icons, lime pop when ready). Pending: Blast phone centring.
- duo-results ported #2196 into worktree (gate 1594); social slot below fold with hold flags. Expect conflicts mpResultsView.ts/MpResultsStage.tsx at rebase. Solo empty band re-sent.
- #2198 deployed f538247a6 (prod /api/version), prod CSS board lip 0 6px 0 confirmed; fix worktree removed. duo-results solo band fixed (117/117).
- duo-play DONE (Blast centred top 187→290, gutters 27/27; gate 1506). duo-results DONE (zero-score round gaps 170px, accepted as content-limited). Waiting: duo-home v3 (home + teacher). Then: review page v2, owner approval.
- duo-home v3 accepted (gate 250): rays hero, PLAY, Friends/Daily cards, 4 filled tiles, single streak card; teacher teal stage + icon squares. Review page v2 published (same URL). All 3 builders idle. WAITING: owner approval → then rebase onto master (conflicts expected MpResultsStage/mpResultsView/PortraitLayout/fire files from #2198), tsc + full suite + build, PR per area.
- 2026-11-27 OWNER: results → restore old MP cream card + emoji bar (phones too) and solo avatar-on-rays hero; liked teacher image. Sent duo-results pass 3. Dev server restarted :3418 for owner to view live.
- 2026-11-27 OWNER: 'when done all push to master' = approval to ship the redesign after results pass 3. Plan: commit worktree, rebase onto origin/master (resolve vs #2196/#2198), tsc + full suite + build, PR, merge on green, deploy check, prod after-shots, remove worktree.
- 2026-11-27 SHIP: committed 9d83964a8 (153 files), rebased onto f538247a6 (took redesign side: it contains #2196/#2198 ports; removed duplicate mpUi.results.nextLabel x6). lint 0 err, tsc 0. Full suite → /tmp/duo-ship-test.log, backend → /tmp/duo-ship-be.log, build → /tmp/duo-ship-build.log. Dev server stopped.
- Full suite: 2 education guard failures (teacher sign-up border contrast, rounded-2xl) fixed (borders cyan/70, cream/50; rounded-neo); guards 8/8, related 87 green. Backend 5219 green, build RC 0.
