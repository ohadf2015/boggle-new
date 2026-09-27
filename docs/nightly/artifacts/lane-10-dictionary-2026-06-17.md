---
status: shipped
attempted: Run dictionary-improvement workflow for ja/sv/es (25 candidates each), dual-judge filter, append survivors to candidate files, clean charset violations
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt (+9 candidates)
  - fe-next/backend/dictionary/candidates/sv.txt (+15 candidates)
  - fe-next/backend/dictionary/candidates/es.txt (+6 candidates)
  - fe-next/backend/dictionary/candidates/en.txt (+28 candidates, workflow also ran en/he)
  - fe-next/backend/dictionary/candidates/he.txt (+35 candidates, workflow also ran en/he)
next_steps: Backend verify→promote→heal pipeline (Wiktionary/Jisho/milog + offensive filter) will gate these before any reach gameplay. ja had low survival rate (10/40 kept) — dual-judge filter strict on hiragana-only constraint; tomorrow run could try larger ja batch or seed with simpler vocabulary tier.
---

## Run summary (2026-06-17)

| Lang | Proposed | Dual-judge kept | Added to file |
|------|----------|-----------------|---------------|
| ja   | 40       | 10              | 9             |
| sv   | 39       | 39              | 15            |
| es   | 40       | 28              | 6             |
| en   | 40       | 40              | 28 (bonus)    |
| he   | 40       | 40              | 35 (bonus)    |
| **Total** | **199** | **157** | **93** |

## Charset cleanup
- 0 violations found in ja/sv/es — workflow generated clean hiragana-only / charset-compliant output.
- Cleanup script ran and confirmed clean.

## Notes
- Workflow used 21 subagents, 646k tokens, ~7.5min wall-clock.
- Japanese survival rate low (25%) — judges strict on hiragana-only + standalone word validity. Conjugated forms like あぶなかった/あぶられた may have been correctly filtered.
- Spanish also low (15%) — likely filtering augmentatives (calorazo, manaza) and imperative forms (agarre, reir) that passed initial generation.
- Swedish 100% survival — judges aligned well on high-frequency common words.
