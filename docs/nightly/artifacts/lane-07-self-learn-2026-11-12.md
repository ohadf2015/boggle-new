status: shipped
attempted: rewrite docs/nightly/learnings.md from the last 7 nights + write docs/nightly/loop-improvements/2026-11-12.md

files_touched:
  - docs/nightly/learnings.md (rewritten, 200 lines — at the <=200 cap)
  - docs/nightly/loop-improvements/2026-11-12.md (new, 117 lines)
  - docs/nightly/reports/2026-11-12.md (Lane 7 section appended; note: reports/ is gitignored)

headline_finding: THE GATE'S BASELINE IS RED, SO ITS "GATE FAILED on lane code" VERDICT IS VOID.
  Airtight proof, no counting needed: `app/[locale]/layout.tsx` is authored by NO lane, and the
  gate reports a compile error in it. A compile error in a non-authored file in a fresh HEAD
  checkout IS a red baseline. 11 identical lines per night:
  `app/[locale]/layout.tsx(4,31): TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'`
  (gitignored, never generated because the gate's typecheck chain omits `npm run build:i18n`).
  Corroboration: 11-11's peel ran `gating 1 authored file(s) [typecheck tier]` -> FAIL six times
  on six different files (03:34-04:29); 11-07 reported `NO PASSING SUBSET - all 6 units failed`.
  (Some of those files DO carry real errors - see below; the baseline red is the part that cannot
  be any lane's fault.) This is day 40 of zero nightly code on master.
  Caveat for whoever acts on this: 11-11's authored set ALSO had 6 genuine TS errors (Word Tower:
  an experiment id, a GrowthEvent, a `nudgeOnBusyTap` prop - each added at one site only). So the
  fix is to SUBTRACT the baseline, never to skip judgment.

top_proposals:
  1. DELTA-GATING. Gate the EMPTY authored set first and record its error set; gate the authored
     set; subtract; ship iff the delta is empty. On a red baseline also emit
     `GATE INOPERABLE: baseline red (<n> pre-existing)` + alert and SKIP the bisect - but judge
     the delta. On 11-11: 11 TS2307 subtracted, 6 Word Tower errors remain -> lane code correctly
     rejected, bisect correctly skipped, ~115m saved.
     (no such probe exists: `rg -c 'baseline-probe|gating 0 authored'` -> NO MATCH)
  2. FOUNDER, one command: cp the already-correct gate-isolated.sh from
     ~/logs/lexi-nightly/salvaged-code-20261023-010005/ (adds build:i18n). Carried 6 windows.
  3. Add `scripts/nightly` to the salvage keep-set in run.sh (~:1179) so the loop can ship
     its own repair. #2 and #3 are blocked on each other; #3 is the cheaper cut.

verified:
  - learnings.md 200 lines (<=200 cap), loop-improvements 117 lines (<=150 cap)
  - no commit, no push (per STEP 5)
  - docs/ only, outside fe-next/ -> cannot affect the lint/type/test/build gate

next_steps:
  - Founder: run proposal #3 then #2 (or #2 alone). Verify with `rg -Nc TS2307` on the next
    gated log going 11 -> 0. Until then every lane's code is dropped regardless of quality.
  - Lane 09: the 2026-11-07 founder free text "Can we have trial for unity?" is still
    unaddressed after 6/6 nights. Name it verbatim in its prompt.
  - Lane 03/05/09/11 prompts: add the three-site rule (new experiment id -> experiments union;
    new event -> GrowthEvent union; new prop -> props interface AND every call site).
    11-11 authored 6 real TS errors, all of this one class. eslint type-checks none of it.
  - Oldest unreplayed salvage stamp: 20261029-010003. Newest: 20261111-010005 (9 files).
