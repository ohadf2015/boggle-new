status: shipped
attempted: rewrite docs/nightly/learnings.md from the 10-31..11-06 window + write docs/nightly/loop-improvements/2026-11-07.md
files_touched:
  - docs/nightly/learnings.md (rewritten, 200 lines = cap)
  - docs/nightly/loop-improvements/2026-11-07.md (new)
  - docs/nightly/reports/2026-11-07.md (appended Lane 7 section; note: reports/ is gitignored)
  - docs/nightly/artifacts/lane-07-self-learn-2026-11-07.md (this file)
key_findings:
  - NEW Headline 0 — 11-06 created NO commit at all. Log printed "shipping (16 docs)" at 04:55:59 but
    `git log --all --oneline --grep="improvement loop 2026-11-06"` is EMPTY and those docs are
    uncommitted in the working tree. The artifact floor holds on disk, not on master.
  - Headline 1 UNCHANGED after 15 nights. `rg -c 'build:i18n' scripts/nightly/lib/gate-isolated.sh`
    -> NO MATCH. 10 TS2307 on the 11-06 log, all `@/lib/i18n/messagesManifest.json`.
  - CORRECTED a false green: TS2307=0 on tonight's log only because the run is IN FLIGHT (lane 07
    runs ~02:10, gate ~03:30). Never count errors in a log whose run has not reached its gate.
  - CORRECTED "inbound Telegram is dead": inbound TEXT works (newest ndjson line is a plain
    {"text":"Can we have trial for unity?"} from of201, no callback_data). Only BUTTONS are dead
    (0 callbacks, 104 days).
  - Stranded refs/nightly-pending ESCALATED 3 -> 9 (10-28..11-02 are new). Yet 11-03/04/05 nightly
    commits ARE ancestors of origin/master, so the dual-write strands even on nights that push fine.
    Local checkout was 20 commits behind origin/master at lane time. `ls .gitattributes` -> NONE.
  - Peel formula 2N-7 confirmed a 7th time (11-06: 35 files -> 63 planned calls, 6 completed,
    4224/3600s, ~704s per call).
founder_directive: "Can we have trial for unity?" — NOT this lane. Lane 09 (monetization/edu upsell)
  owns it; recorded in learnings under FOUNDER DIRECTIVE and as the top product idea. Groundwork is
  already on master (54bfdb6e6 soft trial emails, 8f9da1ce0 trial reminder banner) — the entry point
  on /[locale]/education/for-schools is what is missing.
not_done: No code or script edits — correct for this lane (prompt says DO NOT COMMIT; and
  `scripts/` is dropped as code, so lane-07 infra fixes must be emitted as patches, not edits).
next_steps:
  - FOUNDER, one command each: (1) cp the 10-23 gate-isolated.sh backup to restore build:i18n;
    (2) add scripts/nightly/** to the docs-only salvage keep-set in run.sh (~:1179).
  - Then: make the salvage assert its own commit SHA and make a zero-code ship a loud Telegram ERROR.
  - Then: per-lane gate calls (8, not 2N-7) + enforce file-cap=8 on the keep path.
  - Add .gitattributes (merge=union for impact-ledger.ndjson, mode-readiness.md, perf-baseline.json)
    and git fetch + fast-forward check before the salvage commit.
verified_before_publishing:
  - The Headline 1 `cp` remedy path was carried from last window unverified. Checked tonight:
    ~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh EXISTS
    (58668B, Oct 23 03:20). Added a path-independent fallback to Headline 1 so log rotation cannot
    turn the loop's top-priority instruction into a dead command: `build:i18n` is a real npm script
    (`tsx scripts/build-i18n-assets.ts`, fe-next/package.json:15) and is already inside
    `build:prebuild` (:11) — which the gate never calls. That is the whole bug in one line.
