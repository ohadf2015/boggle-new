status: shipped
attempted: rewrite learnings.md from the last 7 nights, write loop-improvements/2026-10-23.md, and land the
  gate fix that 3 prior windows only described.

## What shipped
- `docs/nightly/learnings.md` — full rewrite. Window 10-17..10-23: 7 scheduled nights, lanes ran on 5,
  **zero nightly code on master for 21 days**.
- `docs/nightly/loop-improvements/2026-10-23.md` — 7 ranked improvements, 2 helper scripts, 3 product ideas.
- `scripts/nightly/lib/gate-isolated.sh` — **the headline fix, applied, not just proposed.** Two edits:
  (a) all four tsc chains (lines 142, 160, 173, 203) now run `build:schemas && build:i18n && tsc --noEmit`;
  (b) **`tsx` added to the `_gate_ensure_bin` self-heal list** (line 112, was `eslint vitest tsc next`).
  (b) is not optional: the gate calls `tsc` as `npx --no-install tsc` precisely because the CoW-cloned
  `.bin` is recurringly broken, but `npm run build:i18n` resolves `tsx` from `.bin` with no such guard — a
  broken symlink there would produce `command not found`, i.e. the unparseable chain failure this fix exists
  to prevent. `bash -n` clean. **Revert with `git checkout -- scripts/nightly/lib/gate-isolated.sh`**
  (the file is tracked; a `/tmp` backup also exists tonight but `/tmp` gets reaped — do not rely on it).

## Why that fix, with proof
`app/[locale]/layout.tsx:4` imports `@/lib/i18n/messagesManifest.json`, which `fe-next/.gitignore:133`
excludes and only `npm run build:i18n` generates. The gate ran `build:schemas` and not `build:i18n`, so in
every clean-HEAD worktree `tsc` emitted TS2307 on a file **no lane authored** — the 10-22 log prints it
**11 times** (lines 1521..1642), once per gate tier. The parser then logged
`all N gate-failing file(s) are non-authored` → `unattributable gate failure` → `docs-only salvage`.
Every tier, every night, by construction.

Decisive new evidence: at 10-22 log line **1614**, directly beneath the TS2307, sat a genuine lane bug —
`WheelRushView.tsx(840,72) TS2322: Property 'prefersReduced' does not exist on MyWordsChipsProps`. The gate
found the real offender and could not act on it. Honest framing: this fix would NOT have shipped 10-22's code
(that code was broken), but it would have peeled one named file in ~17 min instead of burning 97 minutes to
`BISECT BUDGET EXHAUSTED` and dropping all 8 files.

## Caveat on the fix — read this before trusting it
The full worktree dry-run was **attempted and abandoned**: `git worktree add` + `cp -Rc node_modules`
consumed the entire 4-minute command budget and never reached npm. Safety was therefore established
**statically, not empirically**: `build-i18n-assets.ts` reads only tracked inputs (`translations/<lang>.js`,
`i18n/normalizeMessages.ts`, `lib/i18n/landingNamespaces.ts`), calls `mkdirSync(..., {recursive:true})` on
both output dirs (lines 53–54), writes only gitignored paths, and resolves `tsx` from the CoW-cloned
`node_modules` exactly as `tsc` does. **The chain has still never been executed inside a gate worktree.**

## files_touched
- docs/nightly/learnings.md (rewritten)
- docs/nightly/loop-improvements/2026-10-23.md (new)
- docs/nightly/artifacts/lane-07-self-learn-2026-10-23.md (this file)
- scripts/nightly/lib/gate-isolated.sh (4 one-phrase insertions)

## next_steps
1. **FIRST ACT TOMORROW — verify the oracle came up green:**
   `rg "TS2307.*messagesManifest" ~/logs/lexi-nightly/run-20261023-*.log`
   Zero matches = the fix held, and a real gate verdict exists for the first time in 6 nights.
   Any match = revert with `git checkout -- scripts/nightly/lib/gate-isolated.sh` and report that
   `build:i18n` fails inside the gate worktree (the one risk left open above).
   Also note: the source comment calling the typecheck tier "wedge-proof in ~54s" is now **stale** —
   `build:i18n` brotli-compresses 6 locales × 2 bundles in all four tiers. A slower tier tomorrow is expected,
   not a new wedge; the 3600s bisect budget guard still bounds it.
2. Replay the salvage: `scripts/nightly/restore-salvaged-code.sh 20261022-010002` — 8 code files, including
   the diagnosed `WheelRushView` TS2322. Lane 01 STEP 0.
3. Remaining same-size infra items, all unshipped: preflight worktree on a non-master HEAD; loud ERROR on a
   zero-code ship; `lane=<name> kept=<n> code=<n>` in the keep line; root `.gitattributes` with `merge=union`
   for the 3 ledgers that strand `refs/nightly-pending/`.
