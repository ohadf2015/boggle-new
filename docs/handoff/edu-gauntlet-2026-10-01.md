# Education gauntlet vs Blooket: handoff

## FINAL STATE (2026-10-02)

Everything is on master:
- **4862a8c31**: Piece 0 (navigation and access) and B (word list editor + Discover UGC).
- **95c89805c**: A (Teacher HQ), C (projector lobby, host view and honest podium), D (student phone flow), E (Teacher Pro mastery and missed-words practice).

Every piece won the blind side-by-side against Blooket. A, C and E then had a polish round on the gap the critic named.

Gate on the integrated branch:
- tsc, lint, the frontend suite (4214 files), the repo-wide guards and the build are all green.
- The backend suite still has 7 failing tests: `mpBotRounds` (×4) and `boggleSolver.trieLanguages` (×3). They fail the same way on a clean origin/master, so they are PRE-EXISTING. That needs its own investigation: the bots create nothing, and the ru/es tries fail.

### Still open
- [ ] A fresh teacher once saw the student "Join your game" form on /education/classroom-game right after sign-in. It needed a reload, which suggests a race.
- [ ] Unused keys `eduHq.lobby.waitingOne` and `eduHq.lobby.practiceLink`. C's projector footer won the A/C merge.
- [ ] Discover: show play and copy counts when they are > 0, and hide lists whose author has `is_test_account`. The 4 test lists were unpublished by hand on 10-01.
- [ ] Piece 0 leftovers: an Android back loop from classroom-game, the URL flag in MpPhaseRouter, and `/auth/signin` with no page.
- [ ] QA cleanup: the accounts `edu-g-1001-{free,pro}-{1..4}`, `edu-g-fresh-*` and the gate-minted students (`gate-*`) still exist. Purge them scoped to those emails, not the global `is_test_account` predicate, because other sessions' QA accounts share it. Clear the NO ACTION FK children first (see .claude/rules/70-test-accounts.md).
- [ ] Remove the worktrees `~/git/boggle-new-worktrees/edu-{gauntlet,nav,a,b,c,d,e}` when you're done.

---


**Goal (owner):** make the education module simple to manage, fun and polished to play, with micro-animations and little scrolling, good at 390px, built on the multiplayer modes that already work (Wordcraft included), with content teachers can customize and that grows through UGC, plus more Pro value. The bar is Blooket.

## Branches (all pushed to origin, all forked from a9ecc16f8)

| Branch | Piece | State |
|---|---|---|
| `feature/edu-nav` | 0. Navigation and access correctness (TDD, not judged) | **DONE.** Independently reviewed. tsc, lint, touched-dir tests and repo-wide guards green. Ready to merge. |
| `feature/edu-b` | B. Word list editor + Discover UGC library | **WON** the blind comparison (round 2, medium confidence). Has the follow-ups listed below. |
| `feature/edu-a` | A. Teacher HQ → live | WIP, round 2. Last gate fail: the cookie banner pushes /teacher to 1.29 screens at 390x844 (limit 1.15). |
| `feature/edu-c` | C. Projector lobby, host controls, podium | WIP, round 2. Last gate fail: at 390px the leaderboard rows sit hidden under the fixed host control bar. |
| `feature/edu-d` | D. Student phone join/play/results | WIP, round 2. Last gate fail: the student lobby card stays "Classic" after the host switches to Vocab Quiz. |
| `feature/edu-e` | E. Teacher Pro: per-word mastery + missed-words practice, reports, upgrade | WIP, round 2. Last gate fail: class analytics crashes on an emoji avatar passed to next/image (`lib/supabase/analyticsClassroom.ts:128`). **This crash also exists in prod.** |
| `feature/edu-gauntlet` | Integration branch (only this doc so far) | Merge 0 + B first, then each piece once it wins. |

The WIP commits never went through a gate and were never judged. Don't merge them as they are.

## Worktrees and evidence (local, survive reboot)

- `~/git/boggle-new-worktrees/edu-{gauntlet,nav,a,b,c,d,e}`
- `.gauntlet/` in each worktree is git-excluded:
  - CODEMAP.md: module map, nav suspects, guard-test list
  - ANALYTICS.md: PostHog funnel. The access redirect loop, homepage leaks, ROOM_GONE = 100% of refusals, vocab-quiz accuracy 8%.
  - RESEARCH.md: 15 recommendations, plus what teachers pay for
  - LOGIN.md: QA accounts
  - bar/: the Blooket evidence pack. NOTES.md and INDEX.md, `pieces/{A..E}` curated per piece. Blooket's own sites are behind Cloudflare, so it uses 2026 sanity.io screenshots and YouTube frames.
  - baseline/: METRICS.md, FRICTION.md (36 items), ~280 screenshots
  - rounds/<piece>/rN/: our captures, blind X/Y folders, B's MIGRATION_APPLIED.sql
  - orchestration/: edu-pieces.js workflow script, progress.html, INTEGRATION_NOTES.md
- Progress page: https://claude.ai/artifact/MZfTcM4iaRJNp7ioDmuBHm

## Run it again

1. Dev server for each piece worktree:

   ```
   cd ~/git/boggle-new-worktrees/edu-<k>/fe-next && DISABLE_CRONS=1 PORT=332N nohup npm run dev > /tmp/edu-<k>-dev.log 2>&1 &
   ```

   Ports: a=3321, b=3322, c=3323, d=3324, e=3325. node_modules are APFS clones, and .env.local is a relative symlink.
2. Workflow script: `.gauntlet/orchestration/edu-pieces.js`.
   - It reads `args.pieces`. Rebuild the pieces array from the original briefs in the builder transcripts: `~/.claude/projects/-Users-ohadfisher-git-boggle-new/7861d225-*/subagents/workflows/wf_ccc76d86-f57/agent-*.jsonl`, first user message of each `build:X-r1` agent.
   - Or write fresh briefs that start from the "last gate fail" above.
   - Run only the unfinished pieces (A, C, D, E). Don't resume the old run.
3. Loop: builder (Opus) → gatekeeper (Sonnet, inline pass/fail rules) → capture (Sonnet, blind X/Y, side alternates by round parity) → critic (Sonnet).
   - It exits when ours wins with medium or high confidence.
   - It stalls when the same gap appears 3 times in a row, or after 4 gate fails in a row.

## Integration TODO (do before landing on master)

- [ ] **Prod data hygiene.** The gate/capture made test-account lists public in the PROD DB ("Gate B func test", "Gate B list", "Ocean animals" by Ms pro-2). Discover must exclude authors whose profile has `is_test_account`. Unpublish or delete those lists.
- [ ] **B:** the floating avatar/palm-island bubble covers the mobile editor's SAVE button. The same bug class affects the host END ROUND button. Fix it globally for edu pages.
- [ ] **B:** show play and copy counts on Discover cards when they are > 0. The `vocabulary_lesson_stats` table exists.
- [ ] B's migration `20261001153007_vocabulary_lesson_library_ugc.sql` is **already applied to the live DB**. It is committed on feature/edu-b. Never run `supabase db push`.
- [ ] **Merge conflicts to expect:**
  - translations/*.js: each piece has its own namespace (eduHq, eduLibrary, eduLive, eduStudent, eduPro).
  - TeacherDashboard.tsx: nav and A.
  - The multiplayer results components: nav, C and D.
- [ ] **Piece 0 leftovers:**
  - Android history-less back from /education/classroom-game still loops for a teacher.
  - MpPhaseRouter decides classroom mode from the URL flag.
  - `analytics/PageClient.tsx:79` pushes `/auth/signin`, which has no page.
- [ ] Full gate on the integrated branch: `cd fe-next && npm run lint && npm run test && npm run build`. Verify with an RC sentinel and the `.next/BUILD_ID` mtime, then run the repo-wide guards `vitest run __tests__ lib/share/__tests__ lib/dom/__tests__`.
- [ ] **Cleanup when done:**
  - Delete the QA accounts: `edu-g-1001-*`, `edu-g-fresh-*` @lexiclash.test (`DELETE FROM auth.users WHERE id IN (SELECT id FROM profiles WHERE is_test_account)` after a child-row preflight; see .claude/rules/70-test-accounts.md).
  - Remove the worktrees.

## QA accounts

`edu-g-1001-{free,pro}-{1..4}@lexiclash.test`, password `EduGauntlet!1001`. Pro means a `subscriptions` row with tier=pro, active, 60 days.

Mint more with `fe-next/scripts/tmp/edu-qa-accounts.ts` or `mint-fresh-teacher.ts <tag>`. Both are gitignored and live only in the edu-gauntlet and edu-a worktrees; run them with `node_modules/.bin/tsx --env-file=.env.local`.

Allow one live socket per account.

## Lessons from this run

- The gatekeeper caught real things: a weakened test in B, a prod analytics crash in E, a stale-mode bug in D. Keep the inline rules.
- The scratchpad got wiped mid-run by a concurrent session. Keep orchestration files in `.gauntlet/`.
- The watchdog false-alarmed twice:
  - It matched "git push" inside another headless Claude's prompt. Match `comm=git` only.
  - A busy Turbopack server took 42 s to answer. Check for a listening socket instead.
- Round 1 takes about 60–90 min per piece with Opus builders at high effort.
