# Nightly Retrospective — the recurring docs-only drop-all (2026-07-23)

## TL;DR
The nightly gate has been throwing away the code it writes. **12 of the last 20
nightlies (60%) shipped DOCS-ONLY** — reports and ideas committed, every authored
code change reverted. Each night it looked like a *fresh* bug; it is one **class**:
a gate failure the peel loop cannot *attribute to a file* collapses to
"drop all authored code, keep the docs." 2026-07-23 was the latest instance, and
this pass fixes its two root causes and restores the 9 clean files it dropped.

## What happened on 2026-07-23
- SEO lane retitled `app/[locale]/scrabble-alternative-online/page.tsx`
  ("Scrabble **Alternative**…" → "Scrabble Online Free…"). A **committed** test,
  `page.test.tsx`, asserts the title must contain "Scrabble Alternative" → 2 tests failed.
- That was the ONLY failure. 10 other authored files were clean
  (a real `redisAdapter.ts` Sentry fix, an MP issue-probe experiment scaffold across
  `experiments.ts` + `growthTracking.ts` + 5 locales, a `word-games-for-the-classroom` CTA).
- The peel loop could not name the offender → **dropped all 11 files** → docs-only salvage.

## Root cause — two stacked bugs
1. **`[locale]` brackets are unparseable.** `nightly_parse_test_failures` (and the tsc
   branch of `nightly_parse_gate_failures`, and `nightly_parse_worker_crashed_tests`) used
   the char class `[A-Za-z0-9_./-]`, which has no `[` or `]`. The failing path
   `app/[locale]/scrabble-alternative-online/page.test.tsx` stopped parsing at `app/` →
   the FAIL header yielded **no token** → "no parseable offenders" → drop-all.
   *(The next-build branch already anchored brackets via `[][…]`; the test/tsc branches
   were never brought in sync — a latent gap that fires on any `app/[locale]/**` change.)*
2. **A lane-caused test failure was un-peelable, and the decision bailed on it twice.** Even
   once parsed, the failing file is `page.test.tsx`, but only `page.tsx` (the source) was
   authored — a test failure names the test; the change that broke it lives in the source, and
   there was no test→source map. Worse, `nightly_baseline_ship_decision` short-circuited to
   `fallthrough` (→ docs-only) the moment the scoped clean-HEAD baseline came back **green**
   (`brc=0`) — which is *exactly* the 07-23 shape (the test passes on master; the lane broke
   it). "Clean HEAD green" is the strongest signal the lane is at fault, yet the old code read
   it as "give up" — correct only in a world with no source mapping to peel toward.

Traced line-for-line against `run-20260723-010002.log` (17232–17242) and reproduced with
the saved parsers — not inferred.

## The fix (this pass)
- **Parser brackets** (`gate-isolated.sh`): added literal `][` to the three char classes so
  dynamic-route paths parse. Kept in sync with the next-build branch that already did this.
- **Test→source mapping** (`nightly_map_test_to_authored_source`): a failing test maps to the
  authored source it covers (`foo/bar.test.tsx → foo/bar.tsx`; `foo/__tests__/Bar.test.tsx →
  foo/Bar.tsx`), allowlist-intersected so a stray never peels a non-authored file. The peel set
  is now `(directly-authored failing tests) ∪ (authored sources those tests cover)`.
- **Green-baseline reachability** (`nightly_baseline_ship_decision`): removed the
  `brc=0 → fallthrough` short-circuit. A green clean-HEAD baseline now means "the lane introduced
  every failure" → peel the mapped authored source(s), not drop-all. Without this, the mapping
  above was correct but *unreachable* on the 07-23 class (the decision bailed before it ran).
- **Tests** (`gate-isolated.test.sh`): `[locale]` parsing for all three parsers, the mapping
  (sibling + `__tests__/` + non-authored-source guard), and the full 07-23 shape asserting
  `peel → page.tsx` (the 1 offender), NOT drop-all, and NOT the unrelated `redisAdapter`.
- **Restore**: the 9 clean dropped files were re-applied and re-verified green
  (eslint 0, `tsc --noEmit` 0, `test:changed` 1233 files / 9347 tests pass). The scrabble
  title change stays **dropped** — the committed test is right (the page's whole purpose is
  the "scrabble alternative" keyword; dropping it from the `<title>` is an SEO self-own) — and
  is marked resolved in `restore-queue.ndjson`.

## Why it keeps recurring (the class), and the real class-killer
Each docs-only night had a *different* unparseable trigger — brackets (07-23), a missing tool
binary (07-21), a worker fork-crash (07-18), an Abort-trap (07-14). Every one was fixed
reactively by teaching the parser one more format. **The parser will always be one format
behind.** The structural fix is a **subset-peel backstop**: when the gate is RED but no offender
is attributable, never drop-all-code — instead re-gate *subsets* (leave-one-out over the authored
CODE files, using the existing wedge-proof `tsc --noEmit + test:changed` tier, ~1 min each) and
drop only the file whose removal turns the tier green. Bounded (cap the file count; above it,
fall to docs-only and `log()` the cap loudly per Class-4). This makes "unparseable red" ship the
maximum provable-clean subset instead of sacrificing the batch — killing the class for *future*
formats, not just this one.

**Deliberately deferred to its own change**, not bolted onto this fix: it adds a re-gate loop to
the hot 6am-unattended path, and the incident ledger's #1 lesson is that new gate logic is how
fresh silent-failure instances get introduced (Class 4). Ship the proven targeted fix first;
add the backstop as a focused, separately-tested follow-up.

## Follow-ups
- [ ] Subset-peel backstop (above) — the class-killer. Reuses `run_isolated_gate … typecheck tier`.
- [ ] One-line guard so a docs-only salvage that had a **recoverable** code backup fires a louder
      alert (today it's a log line; 60% recurrence went unnoticed for weeks).
- [ ] Periodic check: `git log --grep="autonomous improvement loop"` docs-only ratio — if it
      creeps back up, a new unparseable format has appeared.
