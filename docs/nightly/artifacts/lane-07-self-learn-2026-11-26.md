status: shipped
attempted: rewrite learnings.md from the last 7 nights' own logs (root cause re-derived, never inherited) + write loop-improvements/2026-11-26.md
files_touched:
  - docs/nightly/learnings.md (rewritten, 200 lines — cap met)
  - docs/nightly/loop-improvements/2026-11-26.md (new, 111 lines — cap met)
  - docs/nightly/reports/2026-11-26.md (STEP 6 append)
verified: 3 DO-NOT-EDIT sections byte-identical to HEAD (diff clean); only Reddit day-counter 115->123 changed in the preserved-verbatim region.
headline_finding: the nightly checkout is 134 commits behind origin/master and never fast-forwards. local HEAD 6f09959c5 (11-19 00:39); origin/master c8682142b (11-25); .git/FETCH_HEAD stamped Nov 26 01:00 -> it fetches, never merges. origin merged 165 commits in 8 days, zero nightly. Re-explains 4 separately-filed symptoms: the "foreign sha claimed as a ship" (it is stale LOCAL HEAD), a push that cannot land even on a green gate (non-fast-forward), lanes duplicating already-merged work, and a CoW clone built on a stale tree.
corrected_prior_diagnosis: last window's Headline 2 ("the loop claims a foreign commit as its own ship") was wrong. 6f09959c5 is local HEAD, not the founder's commit being appropriated.
second_finding: all 55 docs/nightly/artifacts/*.md from 11-19..11-26 are UNTRACKED. The artifact floor is authored every night and committed on none. Makes the EXIT-trap commit the only fix that guarantees a non-empty night, independent of both the gate and the stale checkout.
re_derived: error TS2688 is 100% of all gate errors (11-23 = 276, 11-24 = 1932, 11-25 = 1035, nothing else), and the named type lib changes nightly (yauzl, aria-query) -> absence of @types, not a package. It read 0 last window, so inheriting would have missed it. gate-isolated.sh:51 read tonight and verified STILL UNPATCHED.
next_steps: three S-effort unlocks, in order — (1) add scripts/nightly to the run.sh keep-set (~:1179) so the loop can ship its own repair, (2) fast-forward master via git update-ref guarded by merge-base --is-ancestor, tg_alert + exit 3 on divergence, (3) widen the gate-isolated.sh:51 SETUP grep by three strings. All emitted as copy-pasteable patches in learnings.md because scripts/ is still dropped as code. Then (4) EXIT-trap commit of docs/nightly/artifacts/.
not_done: no commit, no push (per lane prompt STEP 5). No scripts/nightly/tools/ helpers written — both proposed helpers would be dropped by integration until unlock (1) lands, so they are specified in loop-improvements instead.
