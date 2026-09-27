---
status: shipped
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt
  - fe-next/backend/dictionary/candidates/he.txt
  - fe-next/backend/dictionary/candidates/en.txt
next_steps: backend verify->promote->heal pipeline will consume new candidates on next run; sv had lowest yield (5 added / 25 proposed) — consider targeted sv run with more specific thematic prompts (food/nature/verbs)
---

## Results

Workflow: `dictionary-improvement` — dual-judge (two personas, both ≥0.75) — ja/sv/es targeted + en/he incidental

| lang | proposed | kept (judges) | added to candidates |
|------|----------|---------------|---------------------|
| en   | 54       | 13            | 11                  |
| he   | 50       | 49            | 24                  |
| sv   | 25       | 5             | 5                   |
| ja   | 49       | 37            | 21                  |
| es   | 43       | 38            | 35                  |
| **total** | **221** | **142** | **96**           |

## Charset cleanup (ja/sv/es)

Dropped: 0 violations — all workflow-generated candidates obeyed charset rules.

## Final candidate file sizes

| file       | lines |
|------------|-------|
| ja.txt     | 577   |
| sv.txt     | 622   |
| es.txt     | 782   |
| he.txt     | 358   |
| en.txt     | 475   |
| **total**  | **2814** |
