---
status: shipped
attempted: Run dictionary-improvement workflow for ja/sv/es (+ en/he auto-included by workflow), dual-judge candidates, append survivors to candidate files, clean charset violations
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt
  - fe-next/backend/dictionary/candidates/en.txt
  - fe-next/backend/dictionary/candidates/he.txt
next_steps: |
  - Run backend verify→promote→heal pipeline to graduate candidates into live validation set
  - Check if any high-frequency ja words were rejected by judges (42 proposed → 36 kept = 14% rejection rate)
  - Consider running es-targeted workflow (dictionary-improvement-es-targeted.js) for deeper ES coverage
---

# Lane 10 Dictionary Improvement — 2026-06-08

## Workflow result

Ran `dictionary-improvement` workflow with `{ langs: ["ja", "sv", "es"], limit: 25 }`.
Workflow auto-included en + he for a full 5-language pass.

| lang | proposed | kept (dual-judge) | added to candidates | candidate file total |
|------|----------|-------------------|---------------------|----------------------|
| en   | 59       | 59                | 54                  | 363 lines            |
| he   | 73       | 73                | 46                  | 163 lines            |
| sv   | 40       | 40                | 26                  | 248 lines            |
| ja   | 42       | 36                | 33                  | 271 lines            |
| es   | 41       | 41                | 32                  | 463 lines            |
| **total** | **255** | **249** | **191** |  1 508 lines total |

- **21 agents**, 604 040 subagent tokens, 97 tool uses, ~206s wall-clock

## Charset cleanup

Ran regex filter (hiragana-only ja, a-zåäö sv, a-zñ es) on the three target languages.
**0 violations dropped** — dual-judge pass already enforced charset constraints.

## Notes

- ja had the highest rejection rate: 6/42 (14%) filtered by judges — hiragana-only constraint
  is strict and the judges caught non-conforming entries before they reached the file
- es candidate file is now the largest (463 lines) — healthy pipeline depth for Spanish,
  which has SEO momentum this week
- Candidates are NOT live words — they await the backend verify→promote→heal pipeline
  (Wiktionary / Jisho / milog + offensive filter) before reaching gameplay
