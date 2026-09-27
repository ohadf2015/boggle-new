---
status: shipped
attempted: Run dictionary-improvement workflow for ja/sv/es (+ en/he ran too), dual-judge survivors, append to candidate files, clean charset violations
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt (+25 candidates)
  - fe-next/backend/dictionary/candidates/sv.txt (+2 candidates)
  - fe-next/backend/dictionary/candidates/es.txt (+10 candidates)
  - fe-next/backend/dictionary/candidates/he.txt (+41 candidates, workflow bonus)
  - fe-next/backend/dictionary/candidates/en.txt (+2 candidates, workflow bonus)
next_steps: >
  Charset cleanup found 0 violations — all added words are well-formed.
  Workflow ran 21 agents, dual-judged all candidates (both personas must agree ≥0.75).
  Total 80 new candidates across 5 languages. Backend verify→promote→heal pipeline
  will gate these before any reach gameplay. Next run: focus on sv (only 2 survived
  dual-judge) — may need more aggressive seed prompts for Swedish coverage.
---

## Results

| Lang | Proposed | Dual-judge survivors | Added to candidates | Charset violations cleaned |
|------|----------|---------------------|---------------------|---------------------------|
| ja   | 40       | 39                  | 25                  | 0                         |
| sv   | 40       | 40                  | 2                   | 0                         |
| es   | 40       | 36                  | 10                  | 0                         |
| he   | 42       | 42                  | 41 (bonus)          | n/a                       |
| en   | 42       | 42                  | 2 (bonus)           | n/a                       |
| **Total** | **204** | **199**        | **80**              | **0**                     |

## File sizes post-run
- `ja.txt`: 791 lines
- `sv.txt`: 761 lines
- `es.txt`: 1071 lines
