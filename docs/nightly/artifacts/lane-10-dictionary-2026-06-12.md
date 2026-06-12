---
status: shipped
attempted: run dictionary-improvement workflow for ja/sv/es (limit=25 each), clean charset violations, append survivors to candidates/*.txt
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt (+28 candidates)
  - fe-next/backend/dictionary/candidates/sv.txt (+24 candidates)
  - fe-next/backend/dictionary/candidates/es.txt (+17 candidates)
  - fe-next/backend/dictionary/candidates/en.txt (+5 candidates, bonus run)
  - fe-next/backend/dictionary/candidates/he.txt (+19 candidates, bonus run)
candidates_added:
  ja: 28  (39 proposed, 39 kept by dual-judge)
  sv: 24  (36 proposed, 25 kept by dual-judge)
  es: 17  (41 proposed, 41 kept by dual-judge)
  en: 5   (41 proposed, 41 kept)
  he: 19  (30 proposed, 30 kept)
  total: 93
charset_violations_cleaned: 0 (all lines already valid)
next_steps: backend verify→promote→heal pipeline will pick up candidates on next run; no action needed
---
