status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 196 lines)
  - docs/nightly/loop-improvements/2026-11-17.md (new, 100 lines)
  - docs/nightly/reports/2026-11-17.md (appended Lane 7 section)

key_finding: >
  The nightly gate's root cause CHANGED and the previous 6 windows of learnings.md were acting on a dead one.
  TS2307/messagesManifest reads 0 on 11-13, -14, -15, -16. The actual error histogram for 11-16 is
  1656 lines, 100% TS2688 "Cannot find type definition file" (1449 on 11-15, also 100%).
  The main repo has all 69 fe-next/node_modules/@types packages, so the loss is inside the gate's
  CoW node_modules clone (gate-isolated.sh:520-525). That is an environment red charged to lane code,
  which is why 11-16 reported "NO PASSING SUBSET (every one of 12 units failed the typecheck tier)".
  The gate already classifies the sibling case (missing .bin symlink) as SETUP rc=2 and never drops code;
  the fix is adding TS2688 to that same predicate at gate-isolated.sh:51 (3 lines, patch in learnings.md Headline 0).

also_confirmed:
  - 11-16 printed "docs-only salvage (15 docs)" and created NO COMMIT on master (4th occurrence).
  - 11-12/-13/-14/-15 each committed 15/15/15/12 files with 0 under fe-next/ -> 45 straight zero-code days.
  - refs/nightly-pending/ grew 9 -> 10; .gitattributes still does not exist.
  - 5 unreplayed salvage backups stacked (salvaged-code-20261112 .. 20261116).

next_steps: >
  1. FOUNDER/human: apply the 3-line TS2688 patch to scripts/nightly/lib/gate-isolated.sh:51 - the loop
     cannot apply it itself because scripts/ is dropped as code (learnings Headline 1).
  2. Then add scripts/nightly to run.sh's keep set (~:1179) so future lane-7 infra fixes self-apply.
  3. Lane 07 tomorrow: FIRST command is
     rg -No 'error TS[0-9]+' <newest gated log> | sort | uniq -c | sort -rn | head
     Treat tonight's TS2688 headline as a hypothesis to retest, never a fact to inherit.
  4. Do NOT run the 10-23 gate-isolated.sh cp from backup - that fixed TS2307, which is already gone.
