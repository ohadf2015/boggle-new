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
