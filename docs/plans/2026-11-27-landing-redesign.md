# Public landing pages redesign (2026-11-27)

Ask: "redesign all the landing pages that look off and old, if needed use higgsfield and generate new
assets to make it feel polished decluttered and modern and clean as well as neo brutalist style".

## State
- Worktree `~/git/boggle-wt-lp1127`, branch `feature/landing-redesign-1127` (from origin/master a5c4071bc).
- Board: `02cf597e` (this), `21110efa` (older landing polish defects, claimed).
- Live "before" shots (46 pages, phone `-m` + desktop `-d`): `~/.cache/lexiclash/lp1127/before/`.
  Re-run: scratchpad `shoot.js <base> <outDir> <paths.txt> md` (analytics blocked).

## Out of scope
- `/education/*`, teacher pages, `/teacher/upgrade` (= /pricing): edu-sky session in `boggle-wt-eduredesign`.
- Homepage (redesigned in #2199, owner verdicts), daily hub (keep as is), app/admin/dev screens.
- `multiplayer-word-game-online` (permanent redirect).

## Rules
- No `<title>`/meta description edits (SEO freeze + 28-day rule). Body/H1/layout fine.
- Copy stays native per locale; keep JSON-LD and FAQ. New strings: `t()` in all 6 locales.
- `neo-*` tokens only. TDD; source-scanning tests named `*.guard.test.ts`.
- Max 3 builders, one-worker test gate behind a lock (RAM).
- Owner approves a before/after review page before merge.

## Template map (paths under fe-next/)
| Kit | Routes |
|---|---|
| `components/landing/comparison/ComparisonLanding.tsx` | vs-scrabble, vs-puzzly-words, vs-wordle |
| `components/seo/VsFoilPage.tsx` | 8 vs-* classroom pages |
| `components/landing/NativePageEnhancements.tsx` | he/sv/ja multiplayer + es juego (partial) |
| RU cluster (copy-paste, `RuLandingLinks`) | 7 ru pages |
| `components/waitlist/ComingSoonLanding.tsx` | 2 Arabic |
| blog / guides PageClient copies, `components/blog/BlogProse` | 31 posts, 3 guides |
| `components/legal/LegalPageLayout.tsx` | about, legal/* |
| Hand-rolled | ~15 vs-*, play-boggle, scrabble-alt, words-with-friends, competitive, online-with-friends, solvers/tools, words, faq/rules/how-to-play etc. |

No shared hero/FAQ/CTA kit exists; FAQ `<details>` repeated inline. Header differs per page
(AutoHideHeader / Header / TopBackLink / none). Install prompts: `DeferredLayoutWidgets.tsx` +
`lib/admob-routes.ts`. Only landing CSS: `components/waitlist/waitlist.module.css`.

## Traffic order (Growth Radar, 28d)
es juego (36k impr) > en/sv word-solver (20k/18k) > en online-with-friends (14.5k) >
en play-boggle (5k) > sv swedish (4k) > en blog best-boggle-alternatives (3k) > he daily-word-wheel
(310 entry sessions) > scrabble-alt, competitive, ja solver, ru erudit/balda.

## Progress (13:55 IST)
- Committed: shared kit `fe-next/components/landing/kit/`, 8 mascot stickers `fe-next/public/landing/kit/`
  (Higgsfield, 14 credits, sources + `gen.sh`/`slice.py` in `~/.cache/lexiclash/lp1127/assets/`),
  reference page `online-word-games-with-friends`.
- Three Opus builders running in this worktree, uncommitted, disjoint files: A keyword/mode landings,
  B comparisons + RU + Hebrew/classroom keyword pages + daily-word-wheel, C tools/content/blog/legal.
  Brief: scratchpad `brief.md`; their shots in `~/.cache/lexiclash/lp1127/after-{A,B,C}/`.
- Live baseline done (consent set, parity fields): `~/.cache/lexiclash/lp1127/before/report-md.json`;
  check with `python3 -I ~/.cache/lexiclash/lp1127/compare.py <after dirs>`.
- Dev server: `PORT=3011` with dummy `NEXT_PUBLIC_SUPABASE_*` (port 3001 belongs to the edu session).
  The shot script must not block `/_next/` URLs (a chunk path contains "sentry").
- 14:2x: builder B done and committed (6508218e2): comparisons, RU, classroom keyword, daily-word-wheel; parity 90 shots 0 failing. A and C still running.
- Review pending for B: view cabanagrams, popple, wordfeud, contra-wordle shots.
- 14:3x: builder C done and committed (b64b82502): tools, blog, words, content, legal; parity 148 pairs 0 failing; guard suite 143 files green. Requests: scratchpad builder-c/requests.md (table align, callout link restyle). Types unverified until tsc.
- 15:xx: builder A done and committed; all three batches in. A parity: 4 pages under 95% words only because
  repeated slogan marquees/decor glyphs were removed (words-with-friends-alt, download-android, word-craft-game, ja).
  Copy facts changed (verified against lib/seo/dictionaryStats.generated.json): sv/he/ja counts, 5->6 languages.
- Independent review (15:xx) found: showcase videos replaced by stills (HIGH, restore), word-shake height
  reservation, hebrew page lost dir=rtl, table captions lost, h3 demotions (balda, RuLandingLinks), juego FAQ
  open-first/exclusive lost, back button replaced by home logo, copy changes (sv/he counts, he About text).
- 15:xx: review findings fixed and committed (766 related tests green). Full parity: 266 shots, 8 failing = the 4
  explained pages. Left: heading parity, word-shake CLS check, stop dev server, tsc+build+suite, review page.
  Back button -> logo is deliberate (parentRoute == home for top-level pages; education keyword pages keep links).
- 15:30: all fixes committed; parity 266 shots (only the 4 explained pages), headings and CLS checked, dev :3011
  stopped. NOW: tsc -> `npm run build` -> `test:frontend` + `test:backend` once -> review page artifact
  (before/after from ~/.cache/lexiclash/lp1127/{before,after-final,after-fix*}) -> owner approval -> PR/merge.
- 15:12: tsc 0 errors; `npm run build` RC 0. Running full shoot on prod build (:3011) -> after-prod/, then suite.
- 15:45: prod-build shots: 266+dyn+juego parity OK, headings OK. Phone pages were 1.09x taller -> kit/blog phone
  spacing tightened; rebuilding, re-shooting, then full suite and review page (`~/.cache/lexiclash/lp1127/build_review.py`).
  Helper scripts live in `~/.cache/lexiclash/lp1127/` (scratchpad was cleared once mid-run).
- 15:50: review page published https://claude.ai/artifact/4QJpueuw6p7gMvTKZoGXor (rebuild: `build_review.py`).
  Full suite running (~/.cache/lexiclash/lp1127/suite-{fe,be}.log). Then WAIT for owner approval before push/PR/merge.
- 16:25: full suite green (FE 61164, BE 5220). GAP FOUND: `/education/*` SEO article/list pages + for-schools are
  out of edu-sky's scope ("stay dark") and were not done here. Doing them now as batch D. `/pricing` = edu session's
  `teacher/upgrade`, in neither scope. Review page line "redesigned separately" must be corrected and republished.
  Before PR: re-check file overlap with current edu branch (incl. components/seo/EducationCalloutLink.tsx).

## Coordinator, after builders stop
1. Apply their requests files; add `landingKit.guard.test.ts` (kit adopters have no hex, listed routes import kit).
2. Full compare.py, view every sheet, independent review of the diff, tsc + build + suite once.
3. Commit per batch, publish before/after review page, wait for owner approval before PR/merge.
4. After merge: GR-Intervention line per surface + `record_intervention`; stop :3011; remove worktree.
