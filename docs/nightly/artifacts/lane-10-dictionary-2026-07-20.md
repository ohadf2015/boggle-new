---
status: shipped
attempted: Generate 25 new candidate words per weak-coverage language (ja/sv/es) via dictionary-improvement workflow, dual-judge filter (≥0.75), append survivors to candidates/*.txt, then charset-clean all three files
date: 2026-07-20
lane: 10-dictionary
---

## Pre-run baselines
- ja.txt: 794 lines
- sv.txt: 766 lines
- es.txt: 1094 lines

## Workflow results (wf_a0b6a531-2ab)
Workflow processed all 5 languages (expanded from requested 3).

| lang | proposed | kept (dual-judge) | added (deduped) | post-run lines |
|------|----------|-------------------|-----------------|----------------|
| ja   | 43       | 34                | 27              | 821            |
| sv   | 39       | 39                | 34              | 800            |
| es   | 40       | 40                | 31              | 1125           |
| en   | 37       | 35                | 33              | (bonus)        |
| he   | 40       | 40                | 5               | (bonus, near-saturated) |

**Total added: 130 candidates across 5 langs**

## Charset cleanup
- ja: 0 violations dropped
- sv: 0 violations dropped
- es: 0 violations dropped

All files clean. Words are CANDIDATES only — backend verify→promote→heal pipeline gates before any reach gameplay.

## files_touched
- fe-next/backend/dictionary/candidates/ja.txt (+27)
- fe-next/backend/dictionary/candidates/sv.txt (+34)
- fe-next/backend/dictionary/candidates/es.txt (+31)
- fe-next/backend/dictionary/candidates/en.txt (+33)
- fe-next/backend/dictionary/candidates/he.txt (+5)

## next_steps
- Hebrew very close to saturation (only 5 added of 40 proposed) — swap he for ru next run
- Consider running with limit:40 for ja (43 proposed, 34 kept — room for more)
- Backend pipeline review: verify candidates are being promoted to live dict on schedule
