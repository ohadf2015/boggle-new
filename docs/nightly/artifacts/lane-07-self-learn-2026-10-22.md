status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 195 lines)
  - docs/nightly/loop-improvements/2026-10-22.md (new, 150 lines)
  - docs/nightly/reports/2026-10-22.md (Lane 7 section appended)
headline: 7/7 nights shipped ZERO code. All three "shipped" commits verified by
  `git show --stat`: d37545770 (12 files, all docs/), 40dddbcd1 (16 files, all docs/),
  c2712f82a (ONE line of restore-queue.ndjson). 5 gate failures all trace to one
  unresolvable import -- app/[locale]/layout.tsx:4 imports @/lib/i18n/messagesManifest.json,
  which .gitignore:133 excludes and only `npm run build:i18n` generates, and the isolated
  gate never runs it. Plus 2 full aborts (10-19, 10-20) on a stranded
  fix/sentry-2026-10-18 checkout. Lanes were rc=0 on 5/5 lane-running nights -- the lanes
  are not the bottleneck, the gate is.
next_steps:
  - IMPROVEMENT #1 FIRST: add `npm run build:i18n && ` after each `npm run build:schemas && `
    in scripts/nightly/lib/gate-isolated.sh lines 142, 160, 173, 203 (FOUR tsc sites; line 833
    is the test-only chain and is NOT one of them). Deliberately NOT done in this lane -- not
    for syntax risk (the inserted string has no quote or $) but because nobody has confirmed
    `build:i18n` (tsx scripts/build-i18n-assets.ts) SUCCEEDS inside the gate's clean-HEAD
    worktree. Run the chain by hand in a throwaway worktree once, then ship. A failing
    build:i18n would turn a parseable TS2307 into an earlier unparseable failure -- worse.
  - #2: preflight should run lanes from an origin/master worktree instead of aborting on a
    non-master HEAD (scripts/nightly/preflight.sh). Cost 10-19 + 10-20 entirely; the advertised
    "retry in 180 min" produced no second log either night.
  - #6: lane 01 STEP 0 replays the newest unshipped salvage stamp -- 5 nights of dropped code
    are on disk with restore-salvaged-code.sh ready and nothing calling it.
  - Meta: loop-improvements/*.md has no owner. Last week's identical #1 was never picked up,
    which directly caused 5 of this window's 7 zero-code nights. Give lane 01 a step that
    ships the top S-effort item from the newest loop-improvements file.
  - Corrected, do not re-raise: MCP scoping WORKS (01-triage gets posthog,sentry,supabase);
    `(none)` is deliberate for the two prompt-only lanes.
